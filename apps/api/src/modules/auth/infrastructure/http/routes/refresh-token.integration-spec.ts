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
import { JwtService, JwtTokenGenerator } from '@/modules/auth/application/jwt'
import { TokenIssuer } from '@/modules/auth/application/services/token-issuer'
import { RefreshTokenUseCase } from '@/modules/auth/application/use-cases/refresh-token-use-case'
import { DrizzleRefreshTokenRepository } from '@/modules/auth/infrastructure/database/repositories/refresh-token-repository'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import {
	refreshToken as refreshTokenTable,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
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
import { RefreshTokenRoute } from './refresh-token'

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
		return 'new-refresh-token-value'
	}
	async hashRefreshToken(token: string): Promise<string> {
		return `hashed:${token}`
	}
}

const USER_ID = 'user-1'
const USER_EMAIL = 'caio@example.com'

describe('POST /refreshToken (integration)', () => {
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
		const refreshTokenRepository = new DrizzleRefreshTokenRepository(txService)

		const tokenIssuer = new TokenIssuer({
			jwtService: new FakeJwtService(),
			tokenGenerator: new FakeJwtTokenGenerator(),
			refreshTokenRepository,
		})

		const refreshTokenUseCase = new RefreshTokenUseCase({
			refreshTokenRepository,
			userRepository,
			tokenGenerator: new FakeJwtTokenGenerator(),
			tokenIssuer,
		})

		app = createApp()
		await app.register(async instance => {
			new RefreshTokenRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				refreshTokenUseCase,
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

	async function seedUser() {
		await db.insert(userTable).values({
			id: USER_ID,
			email: USER_EMAIL,
			roles: ['donor'],
			revokedAt: null,
		})
	}

	async function seedRefreshToken(opts: {
		id: string
		rawToken: string
		used?: boolean
		revoked?: boolean
	}) {
		await db.insert(refreshTokenTable).values({
			id: opts.id,
			userId: USER_ID,
			value: `hashed:${opts.rawToken}`,
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			usedAt: opts.used ? new Date(Date.now() - 1000 * 60) : null,
			revokedAt: opts.revoked ? new Date(Date.now() - 1000 * 60) : null,
		})
	}

	it('retorna 200 com accessToken novo, rotaciona o cookie e marca o antigo como revogado/usado', async () => {
		await seedUser()
		await seedRefreshToken({ id: 'rt-old', rawToken: 'valid-token' })

		const response = await app.inject({
			method: 'POST',
			url: '/refreshToken',
			cookies: { refresh_token: 'valid-token' },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({ accessToken: 'fake-access-token' })

		const cookies = response.cookies as Array<{ name: string; value: string }>
		const refreshCookie = cookies.find(c => c.name === 'refresh_token')
		expect(refreshCookie?.value).toBe('new-refresh-token-value')

		const tokens = await db.select().from(refreshTokenTable)
		expect(tokens).toHaveLength(2)

		const oldToken = tokens.find(t => t.id === 'rt-old')
		expect(oldToken?.usedAt).not.toBeNull()
		expect(oldToken?.revokedAt).not.toBeNull()

		const newToken = tokens.find(t => t.id !== 'rt-old')
		expect(newToken?.value).toBe('hashed:new-refresh-token-value')
		expect(newToken?.userId).toBe(USER_ID)
		expect(newToken?.usedAt).toBeNull()
		expect(newToken?.revokedAt).toBeNull()
	})

	it('retorna 401 quando o cookie refresh_token está ausente', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/refreshToken',
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'Refresh token not found' })
	})

	it('retorna 401 com "Invalid refresh token" quando o token não existe no DB', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/refreshToken',
			cookies: { refresh_token: 'unknown-token' },
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'Invalid refresh token' })

		const tokens = await db.select().from(refreshTokenTable)
		expect(tokens).toHaveLength(0)
	})

	it('detecta replay (token já usado) e revoga todas as sessões do user', async () => {
		await seedUser()
		await seedRefreshToken({
			id: 'rt-used',
			rawToken: 'replayed-token',
			used: true,
		})
		await seedRefreshToken({ id: 'rt-active', rawToken: 'other-active-token' })

		const response = await app.inject({
			method: 'POST',
			url: '/refreshToken',
			cookies: { refresh_token: 'replayed-token' },
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({
			error: 'Refresh token reuse detected — all sessions revoked',
		})

		const tokens = await db.select().from(refreshTokenTable)
		expect(tokens).toHaveLength(2)
		expect(tokens.every(t => t.revokedAt !== null)).toBe(true)
	})
})
