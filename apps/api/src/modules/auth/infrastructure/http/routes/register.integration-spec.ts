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
import { UserRegistered } from '@/modules/auth/public/events/user-registered'
import { DrizzlePasswordCredentialRepository } from '@/modules/auth/infrastructure/database/repositories/password-credential-repository'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import {
	passwordCredential,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
import {
	initializeClock,
	__resetClockForTests,
} from '@/shared/infrastructure/clock'
import {
	initializeIdGenerator,
	__resetIdGeneratorForTests,
} from '@/shared/infrastructure/id-generator'
import { resetDb } from '@/test/reset-db'
import { RegisterRoute } from './register'

class FakeHashGenerator extends HashGenerator {
	async hash(plain: string): Promise<string> {
		return `hashed:${plain}`
	}
}

const baseBody = {
	name: 'Caio Marques',
	email: 'caio@example.com',
	password: 'secret-password',
	phone: '5511987654321',
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

		const userRepository = new DrizzleUserRepository(db)
		const passwordCredentialRepository =
			new DrizzlePasswordCredentialRepository(db)

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
			name: baseBody.name,
			phone: baseBody.phone,
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
			name: 'Existing User',
			phone: '5511000000000',
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

	it('retorna 409 quando o phone já está registrado', async () => {
		await db.insert(userTable).values({
			id: 'existing-2',
			email: 'outro@example.com',
			name: 'Outro User',
			phone: baseBody.phone,
			roles: ['donor'],
			revokedAt: null,
		})

		const response = await app.inject({
			method: 'POST',
			url: '/register',
			payload: baseBody,
		})

		expect(response.statusCode).toBe(409)
		expect(response.json()).toEqual({ error: 'Phone already registered' })

		const users = await db.select().from(userTable)
		expect(users).toHaveLength(1)
		expect(users[0].id).toBe('existing-2')

		const credentials = await db.select().from(passwordCredential)
		expect(credentials).toHaveLength(0)
		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
	})

	it('retorna 409 quando o phone passa pelo zod mas falha no domínio', async () => {
		const response = await app.inject({
			method: 'POST',
			url: '/register',
			payload: { ...baseBody, phone: 'abc' },
		})

		expect(response.statusCode).toBe(409)
		expect(response.json()).toEqual({
			error: 'Phone must have between 12 and 13 digits',
		})

		const users = await db.select().from(userTable)
		expect(users).toHaveLength(0)
		const credentials = await db.select().from(passwordCredential)
		expect(credentials).toHaveLength(0)
		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
	})
})
