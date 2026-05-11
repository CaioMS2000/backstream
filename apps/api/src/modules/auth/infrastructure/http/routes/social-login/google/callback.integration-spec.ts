import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { ArcticFetchError, OAuth2RequestError } from 'arctic'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { JWTPayload } from 'jose'
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	inject,
	it,
} from 'vitest'
import { env } from '@/config'
import { createApp, type HttpApp } from '@/http/app'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import { JwtService, JwtTokenGenerator } from '@/modules/auth/application/jwt'
import { SocialLoginUseCase } from '@/modules/auth/application/use-cases/social-login-use-case'
import { OAuthProviderService } from '@/modules/auth/infrastructure/auth/oauth-provider-service'
import { DrizzleOAuthAccountRepository } from '@/modules/auth/infrastructure/database/repositories/oauth-account-repository'
import { DrizzleOAuthStateRepository } from '@/modules/auth/infrastructure/database/repositories/oauth-state-repository'
import { DrizzleRefreshTokenRepository } from '@/modules/auth/infrastructure/database/repositories/refresh-token-repository'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import {
	oauthAccount,
	oauthState,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
import { FakeOAuthProviderAdapter } from '@/modules/auth/test/fake-oauth-provider-adapter'
import {
	initializeClock,
	__resetClockForTests,
} from '@/shared/infrastructure/clock'
import {
	initializeIdGenerator,
	__resetIdGeneratorForTests,
} from '@/shared/infrastructure/id-generator'
import { resetDb } from '@/test/reset-db'
import { GoogleSocialLoginCallbackRoute } from './callback'

class FakeJwtService extends JwtService {
	async sign(): Promise<string> {
		return 'fake-access-token'
	}
	async verify<T extends JWTPayload = JWTPayload>(): Promise<T> {
		return {} as T
	}
	async decode<T extends JWTPayload = JWTPayload>(): Promise<T> {
		return {} as T
	}
	async signAccessToken(): Promise<string> {
		return 'fake-access-token'
	}
	async verifyAccessToken(): Promise<JWTPayload | null> {
		return null
	}
}

class FakeJwtTokenGenerator extends JwtTokenGenerator {
	async generateRefreshToken(): Promise<string> {
		return 'fake-refresh-token'
	}
	async hashRefreshToken(): Promise<string> {
		return 'fake-refresh-token-hash'
	}
}

const FAKE_PROFILE = {
	providerAccountId: 'g-123',
	email: 'test@example.com',
	name: 'Test User',
}

describe('GET /social-login/google/callback (integration)', () => {
	let app: HttpApp
	let db: DrizzleClient
	let oauthStateRepository: DrizzleOAuthStateRepository
	let fakeAdapter: FakeOAuthProviderAdapter

	beforeAll(async () => {
		initializeClock()
		initializeIdGenerator('v7')

		db = createDrizzle(inject('databaseUrl'))

		fakeAdapter = new FakeOAuthProviderAdapter('google', FAKE_PROFILE)
		const oauthProviderService = new OAuthProviderService([fakeAdapter])

		oauthStateRepository = new DrizzleOAuthStateRepository(db)
		const userRepository = new DrizzleUserRepository(db)
		const oauthAccountRepository = new DrizzleOAuthAccountRepository(db)
		const refreshTokenRepository = new DrizzleRefreshTokenRepository(db)

		const socialLoginUseCase = new SocialLoginUseCase({
			userRepository,
			oauthAccountRepository,
			refreshTokenRepository,
			jwtService: new FakeJwtService(),
			tokenGenerator: new FakeJwtTokenGenerator(),
			domainEvents: new DomainEventDispatcher(),
			integrationBus: new IntegrationEventBus(),
		})

		app = createApp()
		await app.register(async instance => {
			new GoogleSocialLoginCallbackRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				oauthProviderService,
				oauthStateRepository,
				socialLoginUseCase,
			}).register()
		})
		await app.ready()
	})

	afterEach(async () => {
		await resetDb(db)
		fakeAdapter.mockError = undefined
	})

	afterAll(async () => {
		await app.close()
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	async function seedState(state: string, provider = 'google') {
		await oauthStateRepository.save(
			state,
			{ codeVerifier: 'verifier-1', provider, role: 'donor' },
			600
		)
	}

	it('redireciona para oauth-success, seta cookies e cria usuário novo', async () => {
		await seedState('s-new')

		const response = await app.inject({
			method: 'GET',
			url: '/social-login/google/callback?code=c-1&state=s-new',
		})

		expect(response.statusCode).toBe(302)
		expect(response.headers.location).toBe(
			`${env.FRONTEND_URL}/oauth-success?new=true`
		)

		const cookies = response.cookies as Array<{ name: string; value: string }>
		const refreshCookie = cookies.find(c => c.name === 'refresh_token')
		const handoffCookie = cookies.find(c => c.name === 'access_token_handoff')
		expect(refreshCookie?.value).toBe('fake-refresh-token')
		expect(handoffCookie?.value).toBe('fake-access-token')

		const users = await db.select().from(userTable)
		expect(users).toHaveLength(1)
		expect(users[0]).toMatchObject({
			email: FAKE_PROFILE.email,
			name: FAKE_PROFILE.name,
			roles: ['donor'],
		})

		const accounts = await db.select().from(oauthAccount)
		expect(accounts).toHaveLength(1)
		expect(accounts[0]).toMatchObject({
			provider: 'google',
			providerAccountId: FAKE_PROFILE.providerAccountId,
			userId: users[0].id,
		})

		const remainingStates = await db.select().from(oauthState)
		expect(remainingStates).toHaveLength(0)
	})

	it('redireciona com new=false quando o usuário já existe', async () => {
		// Pré-popula state + user existente já vinculado ao provider
		await seedState('s-existing')
		await db.insert(userTable).values({
			id: 'existing-user-1',
			email: FAKE_PROFILE.email,
			name: 'Pre Existing',
			phone: null,
			roles: ['donor'],
			revokedAt: null,
		})
		await db.insert(oauthAccount).values({
			id: 'existing-account-1',
			userId: 'existing-user-1',
			provider: 'google',
			providerAccountId: FAKE_PROFILE.providerAccountId,
		})

		const response = await app.inject({
			method: 'GET',
			url: '/social-login/google/callback?code=c-1&state=s-existing',
		})

		expect(response.statusCode).toBe(302)
		expect(response.headers.location).toBe(
			`${env.FRONTEND_URL}/oauth-success?new=false`
		)

		const users = await db.select().from(userTable)
		expect(users).toHaveLength(1)
		expect(users[0].id).toBe('existing-user-1')
	})

	it('responde 400 JSON quando o state não existe no DB', async () => {
		const response = await app.inject({
			method: 'GET',
			url: '/social-login/google/callback?code=c-1&state=does-not-exist',
		})

		expect(response.statusCode).toBe(400)
		expect(response.json()).toEqual({ error: 'Invalid or expired state' })
	})

	it('responde 400 JSON quando o state pertence a outro provider', async () => {
		await seedState('s-other-provider', 'facebook')

		const response = await app.inject({
			method: 'GET',
			url: '/social-login/google/callback?code=c-1&state=s-other-provider',
		})

		expect(response.statusCode).toBe(400)
		expect(response.json()).toEqual({ error: 'Invalid or expired state' })
	})

	it('redireciona para oauth-error?reason=invalid-code quando o provider rejeita o code (invalid_grant)', async () => {
		await seedState('s-invalid-grant')
		fakeAdapter.mockError = new OAuth2RequestError(
			'invalid_grant',
			'Code expired',
			null,
			null
		)

		const response = await app.inject({
			method: 'GET',
			url: '/social-login/google/callback?code=c-expired&state=s-invalid-grant',
		})

		expect(response.statusCode).toBe(302)
		expect(response.headers.location).toBe(
			`${env.FRONTEND_URL}/oauth-error?reason=invalid-code`
		)

		const users = await db.select().from(userTable)
		expect(users).toHaveLength(0)
	})

	it('redireciona para oauth-error?reason=provider-unavailable em falha de rede', async () => {
		await seedState('s-network')
		fakeAdapter.mockError = new ArcticFetchError(new Error('ECONNREFUSED'))

		const response = await app.inject({
			method: 'GET',
			url: '/social-login/google/callback?code=c-1&state=s-network',
		})

		expect(response.statusCode).toBe(302)
		expect(response.headers.location).toBe(
			`${env.FRONTEND_URL}/oauth-error?reason=provider-unavailable`
		)
	})

	it('redireciona para oauth-error?reason=unknown em erro de config (invalid_client)', async () => {
		await seedState('s-config')
		fakeAdapter.mockError = new OAuth2RequestError(
			'invalid_client',
			'Bad client credentials',
			null,
			null
		)

		const response = await app.inject({
			method: 'GET',
			url: '/social-login/google/callback?code=c-1&state=s-config',
		})

		expect(response.statusCode).toBe(302)
		expect(response.headers.location).toBe(
			`${env.FRONTEND_URL}/oauth-error?reason=unknown`
		)
	})
})
