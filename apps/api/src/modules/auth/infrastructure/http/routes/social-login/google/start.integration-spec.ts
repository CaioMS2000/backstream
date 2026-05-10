import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	inject,
	it,
} from 'vitest'
import { createApp, type HttpApp } from '@/http/app'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import { OAuthProviderService } from '@/modules/auth/infrastructure/auth/oauth-provider-service'
import { DrizzleOAuthStateRepository } from '@/modules/auth/infrastructure/database/repositories/oauth-state-repository'
import { oauthState } from '@/modules/auth/infrastructure/database/schemas'
import { FakeOAuthProviderAdapter } from '@/modules/auth/test/fake-oauth-provider-adapter'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { resetDb } from '@/test/reset-db'
import { GoogleSocialLoginStartRoute } from './start'

describe('POST /social-login/google/start (integration)', () => {
	let app: HttpApp
	let db: DrizzleClient

	beforeAll(async () => {
		initializeClock()
		initializeIdGenerator('v7')

		db = createDrizzle(inject('databaseUrl'))

		const fakeAdapter = new FakeOAuthProviderAdapter(
			'google',
			{
				providerAccountId: 'g-unused',
				email: 'unused@example.com',
				name: 'Unused',
			},
			{
				url: new URL('https://accounts.google.com/o/oauth2/v2/auth?fake=1'),
				state: 'fake-state-1',
				codeVerifier: 'fake-verifier-1',
			}
		)
		const oauthProviderService = new OAuthProviderService([fakeAdapter])
		const oauthStateRepository = new DrizzleOAuthStateRepository(db)

		app = createApp()
		await app.register(async instance => {
			new GoogleSocialLoginStartRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				oauthProviderService,
				oauthStateRepository,
			}).register()
		})
		await app.ready()
	})

	afterEach(async () => {
		await resetDb(db)
	})

	afterAll(async () => {
		await app.close()
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('retorna a URL de autorização e persiste o oauth_state', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/social-login/google/start',
			payload: { role: 'donor' },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({
			url: 'https://accounts.google.com/o/oauth2/v2/auth?fake=1',
		})

		const persisted = await db.select().from(oauthState)
		expect(persisted).toHaveLength(1)
		expect(persisted[0]).toMatchObject({
			state: 'fake-state-1',
			codeVerifier: 'fake-verifier-1',
			provider: 'google',
			roles: ['donor'],
		})
	})

	it('aceita role streamer também', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/social-login/google/start',
			payload: { role: 'streamer' },
		})

		expect(response.statusCode).toBe(200)
		const persisted = await db.select().from(oauthState)
		expect(persisted[0]?.roles).toEqual(['streamer'])
	})

	it('rejeita body sem role', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/social-login/google/start',
			payload: {},
		})

		expect(response.statusCode).toBe(400)
		const persisted = await db.select().from(oauthState)
		expect(persisted).toHaveLength(0)
	})

	it('rejeita role fora do enum', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/social-login/google/start',
			payload: { role: 'admin' },
		})

		expect(response.statusCode).toBe(400)
	})
})
