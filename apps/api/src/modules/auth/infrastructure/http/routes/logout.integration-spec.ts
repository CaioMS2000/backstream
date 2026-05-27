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
import { JwtTokenGenerator } from '@/modules/auth/application/jwt'
import { LogoutUseCase } from '@/modules/auth/application/use-cases/logout-use-case'
import type { Role } from '@/modules/auth/domain/role'
import { DrizzleRefreshTokenRepository } from '@/modules/auth/infrastructure/database/repositories/refresh-token-repository'
import {
	refreshToken as refreshTokenTable,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
import { AccessTokenVerifier } from '@/modules/auth/public/services/access-token-verifier'
import type { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'
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
import { LogoutRoute } from './logout'

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

class FakeJwtTokenGenerator extends JwtTokenGenerator {
	async generateRefreshToken(): Promise<string> {
		return 'unused'
	}
	async hashRefreshToken(token: string): Promise<string> {
		return `hashed:${token}`
	}
}

describe('POST /logout (integration)', () => {
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

		const refreshTokenRepository = new DrizzleRefreshTokenRepository(txService)
		const logoutUseCase = new LogoutUseCase({
			refreshTokenRepository,
			tokenGenerator: new FakeJwtTokenGenerator(),
		})
		const authed = makeAuthed(makeAuthGuard(new FakeAccessTokenVerifier()))

		app = createApp()
		await app.register(async instance => {
			new LogoutRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				authed,
				logoutUseCase,
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

	async function seedUserAndRefreshToken() {
		await db.insert(userTable).values({
			id: USER_ID,
			email: USER_EMAIL,
			roles: ['donor'],
			revokedAt: null,
		})
		await db.insert(refreshTokenTable).values({
			id: 'rt-1',
			userId: USER_ID,
			value: 'hashed:my-refresh',
			expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			usedAt: null,
			revokedAt: null,
		})
	}

	it('retorna 200 e revoga o refresh token no DB', async () => {
		await seedUserAndRefreshToken()

		const response = await app.inject({
			method: 'POST',
			url: '/logout',
			headers: { authorization: 'Bearer valid-access-token' },
			cookies: { refresh_token: 'my-refresh' },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({ message: 'Logged out successfully' })

		const tokens = await db.select().from(refreshTokenTable)
		expect(tokens).toHaveLength(1)
		expect(tokens[0].revokedAt).not.toBeNull()
	})

	it('retorna 401 quando o auth header está ausente', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/logout',
			cookies: { refresh_token: 'my-refresh' },
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'unauthorized' })
	})

	it('retorna 401 quando autenticado mas sem cookie refresh_token', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/logout',
			headers: { authorization: 'Bearer valid-access-token' },
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'Refresh token not found' })
	})
})
