import { AsyncLocalStorage } from 'node:async_hooks'
import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	inject,
	it,
	type Mock,
	vi,
} from 'vitest'
import { createApp, type HttpApp } from '@/http/app'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import { HashGenerator } from '@/modules/auth/application/cryptography/hash-generator'
import { RegisterUseCase } from '@/modules/auth/application/use-cases/register-use-case'
import { DrizzlePasswordCredentialRepository } from '@/modules/auth/infrastructure/database/repositories/password-credential-repository'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import {
	passwordCredential,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
import { UserRegistered } from '@/modules/auth/public/events/user-registered'
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
import { RegisterRoute } from './register'

class FakeHashGenerator extends HashGenerator {
	async hash(plain: string): Promise<string> {
		return `hashed:${plain}`
	}
}

const baseBody = {
	email: 'caio@example.com',
	password: 'secret-password',
	role: 'donor' as const,
}

describe('POST /register (integration)', () => {
	let app: HttpApp
	let db: DrizzleClient
	let userRegisteredSubscriber: Mock<(event: UserRegistered) => Promise<void>>

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

		const domainEvents = new DomainEventDispatcher()
		const integrationBus = new IntegrationEventBus()
		userRegisteredSubscriber = vi.fn(async (_event: UserRegistered) => {})
		integrationBus.subscribe(UserRegistered, userRegisteredSubscriber)

		const registerUseCase = new RegisterUseCase({
			userRepository,
			passwordCredentialRepository,
			hashGenerator: new FakeHashGenerator(),
			domainEvents,
			integrationBus,
		})

		app = createApp()
		await app.register(async instance => {
			new RegisterRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				registerUseCase,
			}).register()
		})
		await app.ready()
	})

	afterEach(async () => {
		await resetDb(db)
		userRegisteredSubscriber.mockClear()
	})

	afterAll(async () => {
		await app.close()
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('retorna 200, persiste user + credential e publica UserRegistered', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/register',
			payload: baseBody,
		})

		expect(response.statusCode).toBe(200)

		const users = await db.select().from(userTable)
		expect(users).toHaveLength(1)
		expect(users[0]).toMatchObject({
			email: baseBody.email,
			roles: ['donor'],
		})

		expect(response.json()).toEqual({
			user: {
				userId: users[0].id,
				email: baseBody.email,
				roles: ['donor'],
			},
		})

		const credentials = await db.select().from(passwordCredential)
		expect(credentials).toHaveLength(1)
		expect(credentials[0]).toMatchObject({
			userId: users[0].id,
			passwordHash: `hashed:${baseBody.password}`,
			revokedAt: null,
		})

		expect(userRegisteredSubscriber).toHaveBeenCalledTimes(1)
		const event = userRegisteredSubscriber.mock.calls[0][0]
		expect(event).toBeInstanceOf(UserRegistered)
		expect(event.userId).toBe(users[0].id)
		expect(event.email).toBe(baseBody.email)
	})

	it('retorna 409 quando o email já está registrado', async () => {
		await db.insert(userTable).values({
			id: 'existing-1',
			email: baseBody.email,
			roles: ['donor'],
			revokedAt: null,
		})

		const response = await app.inject({
			method: 'POST',
			url: '/register',
			payload: baseBody,
		})

		expect(response.statusCode).toBe(409)
		expect(response.json()).toEqual({ error: 'Email already registered' })

		const users = await db.select().from(userTable)
		expect(users).toHaveLength(1)
		expect(users[0].id).toBe('existing-1')

		const credentials = await db.select().from(passwordCredential)
		expect(credentials).toHaveLength(0)
		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
	})
})
