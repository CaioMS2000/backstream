import { AsyncLocalStorage } from 'node:async_hooks'
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
import { createApp, type HttpApp } from '@/http/app'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import { HashVerifier } from '@/modules/auth/application/cryptography/hash-verifier'
import { JwtService, JwtTokenGenerator } from '@/modules/auth/application/jwt'
import { TokenIssuer } from '@/modules/auth/application/services/token-issuer'
import { LoginUseCase } from '@/modules/auth/application/use-cases/login-use-case'
import { DrizzlePasswordCredentialRepository } from '@/modules/auth/infrastructure/database/repositories/password-credential-repository'
import { DrizzleRefreshTokenRepository } from '@/modules/auth/infrastructure/database/repositories/refresh-token-repository'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import {
	passwordCredential,
	refreshToken as refreshTokenTable,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
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
import { LoginRoute } from './login'

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

class FakeHashVerifier extends HashVerifier {
	async verify(hashed: string, password: string): Promise<boolean> {
		return hashed === `hashed:${password}`
	}
}

describe('POST /login (integration)', () => {
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
		const passwordCredentialRepository =
			new DrizzlePasswordCredentialRepository(txService)
		const refreshTokenRepository = new DrizzleRefreshTokenRepository(txService)

		const tokenIssuer = new TokenIssuer({
			jwtService: new FakeJwtService(),
			tokenGenerator: new FakeJwtTokenGenerator(),
			refreshTokenRepository,
		})

		const loginUseCase = new LoginUseCase({
			userRepository,
			passwordCredentialRepository,
			hashVerifier: new FakeHashVerifier(),
			tokenIssuer,
		})

		const profileComposer = new ProfileSummaryComposer(
			new ProfileSummaryQueryFromRepo(new DrizzleProfileRepository(txService))
		)

		app = createApp()
		await app.register(async instance => {
			new LoginRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				loginUseCase,
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

	async function seedUserWithPassword(opts: {
		email: string
		password: string
	}) {
		const userId = 'user-1'
		await db.insert(userTable).values({
			id: userId,
			email: opts.email,
			roles: ['donor'],
			revokedAt: null,
		})
		await db.insert(passwordCredential).values({
			id: 'credential-1',
			userId,
			passwordHash: `hashed:${opts.password}`,
			revokedAt: null,
		})
		await db.insert(profileTable).values({
			id: 'profile-1',
			userId,
			name: 'Caio Tester',
			phone: null,
			avatarUrl: null,
		})
		return userId
	}

	it('retorna 200, accessToken e seta refresh_token cookie no caminho feliz', async () => {
		const userId = await seedUserWithPassword({
			email: 'caio@example.com',
			password: 'secret',
		})

		const response = await app.inject({
			method: 'POST',
			url: '/login',
			payload: { email: 'caio@example.com', password: 'secret' },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toMatchObject({
			accessToken: 'fake-access-token',
			user: {
				userId,
				email: 'caio@example.com',
				roles: ['donor'],
				name: 'Caio Tester',
				avatarUrl: null,
				profileCompleted: false,
			},
		})

		const cookies = response.cookies as Array<{ name: string; value: string }>
		const refreshCookie = cookies.find(c => c.name === 'refresh_token')
		expect(refreshCookie?.value).toBe('fake-refresh-token')

		const storedTokens = await db.select().from(refreshTokenTable)
		expect(storedTokens).toHaveLength(1)
		expect(storedTokens[0].userId).toBe(userId)
	})

	it('retorna 401 quando o email não existe', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/login',
			payload: { email: 'ghost@example.com', password: 'secret' },
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'Invalid credentials' })

		const cookies = response.cookies as Array<{ name: string; value: string }>
		expect(cookies.find(c => c.name === 'refresh_token')).toBeUndefined()
	})

	it('retorna 401 quando a senha está errada', async () => {
		await seedUserWithPassword({
			email: 'caio@example.com',
			password: 'secret',
		})

		const response = await app.inject({
			method: 'POST',
			url: '/login',
			payload: { email: 'caio@example.com', password: 'wrong-password' },
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'Invalid credentials' })

		const storedTokens = await db.select().from(refreshTokenTable)
		expect(storedTokens).toHaveLength(0)
	})
})
