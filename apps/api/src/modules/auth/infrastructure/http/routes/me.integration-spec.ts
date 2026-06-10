import { AsyncLocalStorage } from 'node:async_hooks'
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
import { makeAuthed } from '@/http/auth-factory'
import { makeAuthGuard } from '@/http/middleware/auth/authed'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import type { Role } from '@/modules/auth/domain/role'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import { user as userTable } from '@/modules/auth/infrastructure/database/schemas'
import { UserSummaryQueryFromRepo } from '@/modules/auth/infrastructure/queries/user-summary-query-from-repo'
import { AccessTokenVerifier } from '@/modules/auth/public/services/access-token-verifier'
import type { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'
import { DrizzleProfileRepository } from '@/modules/profile/infrastructure/database/repositories/profile-repository'
import { profile as profileTable } from '@/modules/profile/infrastructure/database/schemas'
import { ProfileSummaryQueryFromRepo } from '@/modules/profile/infrastructure/queries/profile-summary-query-from-repo'
import { ProfileSummaryComposer } from '@/shared/http/profile-summary-composer'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import type { DrizzleTx } from '@/shared/transaction/db-context'
import { DrizzleTransactionService } from '@/shared/transaction/drizzle-transaction-service'
import { resetDb } from '@/test/reset-db'
import { MeRoute } from './me'

const USER_ID = 'user-1'
const USER_EMAIL = 'caio@example.com'

class FakeAccessTokenVerifier extends AccessTokenVerifier {
	async verify(token: string): Promise<AuthenticatedUser | null> {
		if (token !== 'valid-access-token') return null
		return {
			userId: USER_ID,
			email: USER_EMAIL,
			roles: ['donor'] as Role[],
		}
	}
}

describe('GET /me (integration)', () => {
	let app: HttpApp
	let db: DrizzleClient

	beforeAll(async () => {
		initializeClock()
		initializeIdGenerator('v7')

		db = createDrizzle(inject('databaseUrl'))
		const txService = new DrizzleTransactionService(
			db,
			new AsyncLocalStorage<DrizzleTx>()
		)

		const userRepository = new DrizzleUserRepository(txService)
		const userSummaryQuery = new UserSummaryQueryFromRepo(userRepository)
		const profileComposer = new ProfileSummaryComposer(
			new ProfileSummaryQueryFromRepo(new DrizzleProfileRepository(txService))
		)
		const authed = makeAuthed(makeAuthGuard(new FakeAccessTokenVerifier()))

		app = createApp()
		await app.register(async instance => {
			new MeRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				authed,
				userSummaryQuery,
				profileComposer,
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

	async function seedUser(opts: { revoked?: boolean } = {}) {
		await db.insert(userTable).values({
			id: USER_ID,
			email: USER_EMAIL,
			roles: ['donor'],
			revokedAt: opts.revoked ? new Date() : null,
		})
		await db.insert(profileTable).values({
			id: 'profile-1',
			userId: USER_ID,
			name: 'Caio Tester',
			phone: null,
			avatarUrl: null,
		})
	}

	it('retorna 200 com o resumo do user autenticado', async () => {
		await seedUser()

		const response = await app.inject({
			method: 'GET',
			url: '/me',
			headers: { authorization: 'Bearer valid-access-token' },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({
			userId: USER_ID,
			email: USER_EMAIL,
			roles: ['donor'],
			name: 'Caio Tester',
			avatarUrl: null,
			profileCompleted: false,
		})
	})

	it('retorna 401 quando o auth header está ausente', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/me',
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'unauthorized' })
	})

	it('retorna 401 quando o token é válido mas o user não existe no DB', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/me',
			headers: { authorization: 'Bearer valid-access-token' },
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'unauthorized' })
	})
})
