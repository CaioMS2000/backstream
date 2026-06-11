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
import { AddRoleUseCase } from '@/modules/auth/application/use-cases/add-role-use-case'
import { RemoveRoleUseCase } from '@/modules/auth/application/use-cases/remove-role-use-case'
import type { Role } from '@/modules/auth/domain/role'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import { user as userTable } from '@/modules/auth/infrastructure/database/schemas'
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
import { ManageRolesRoute } from './roles'

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

describe('/me/roles (integration)', () => {
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
		const addRoleUseCase = new AddRoleUseCase({ userRepository })
		const removeRoleUseCase = new RemoveRoleUseCase({ userRepository })
		const authed = makeAuthed(makeAuthGuard(new FakeAccessTokenVerifier()))

		app = createApp()
		await app.register(async instance => {
			new ManageRolesRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				authed,
				addRoleUseCase,
				removeRoleUseCase,
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

	async function seedUser(roles: Role[]) {
		await db.insert(userTable).values({
			id: USER_ID,
			email: USER_EMAIL,
			roles,
			revokedAt: null,
		})
	}

	it('POST adiciona uma role e retorna o array atualizado', async () => {
		await seedUser(['donor'])

		const response = await app.inject({
			method: 'POST',
			url: '/me/roles/streamer',
			headers: { authorization: 'Bearer valid-access-token' },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({ roles: ['donor', 'streamer'] })

		const users = await db.select().from(userTable)
		expect(users[0].roles).toEqual(['donor', 'streamer'])
	})

	it('POST /me/roles/admin retorna 403', async () => {
		await seedUser(['donor'])

		const response = await app.inject({
			method: 'POST',
			url: '/me/roles/admin',
			headers: { authorization: 'Bearer valid-access-token' },
		})

		expect(response.statusCode).toBe(403)

		const users = await db.select().from(userTable)
		expect(users[0].roles).toEqual(['donor'])
	})

	it('DELETE remove uma role quando há mais de uma', async () => {
		await seedUser(['donor', 'streamer'])

		const response = await app.inject({
			method: 'DELETE',
			url: '/me/roles/streamer',
			headers: { authorization: 'Bearer valid-access-token' },
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({ roles: ['donor'] })
	})

	it('DELETE da última role retorna 409', async () => {
		await seedUser(['donor'])

		const response = await app.inject({
			method: 'DELETE',
			url: '/me/roles/donor',
			headers: { authorization: 'Bearer valid-access-token' },
		})

		expect(response.statusCode).toBe(409)

		const users = await db.select().from(userTable)
		expect(users[0].roles).toEqual(['donor'])
	})

	it('retorna 401 sem token', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/me/roles/streamer',
		})

		expect(response.statusCode).toBe(401)
	})
})
