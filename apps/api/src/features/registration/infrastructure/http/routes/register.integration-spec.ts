import { AsyncLocalStorage } from 'node:async_hooks'
import { failure } from '@backstream/core'
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
import { buildRegistrationFeature } from '@/features/registration/registration-feature'
import { RegistrationCompleted } from '@/features/registration/public/events/registration-completed'
import { createApp, type HttpApp } from '@/http/app'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import { buildAuthModule } from '@/modules/auth/auth-module'
import { TokenService } from '@/modules/auth/infrastructure/auth/token-service'
import { DrizzleOAuthAccountRepository } from '@/modules/auth/infrastructure/database/repositories/oauth-account-repository'
import { DrizzleOAuthStateRepository } from '@/modules/auth/infrastructure/database/repositories/oauth-state-repository'
import { DrizzlePasswordCredentialRepository } from '@/modules/auth/infrastructure/database/repositories/password-credential-repository'
import { DrizzleRefreshTokenRepository } from '@/modules/auth/infrastructure/database/repositories/refresh-token-repository'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import {
	passwordCredential,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
import { OAuthProviderService } from '@/modules/auth/infrastructure/auth/oauth-provider-service'
import { FakeHashGenerator } from '@/modules/auth/test/fake-hash-generator'
import { FakeJwtService } from '@/modules/auth/test/fake-jwt-service'
import { FakeJwtTokenGenerator } from '@/modules/auth/test/fake-jwt-token-generator'
import { ProfileAlreadyExistsError } from '@/modules/profile/application/@errors/profile-already-exists-error'
import { DrizzleProfileRepository } from '@/modules/profile/infrastructure/database/repositories/profile-repository'
import { profile as profileTable } from '@/modules/profile/infrastructure/database/schemas'
import {
	buildProfileModule,
	type ProfileModule,
} from '@/modules/profile/profile-module'
import { CreateProfileCommand } from '@/modules/profile/public/commands/create-profile-command'
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
import { registerRegistrationRoutes } from './index'

const baseBody = {
	email: 'caio@example.com',
	password: 'secret-password',
	role: 'donor' as const,
}

function buildApp(opts: {
	db: DrizzleClient
	overrideCreateProfile?: CreateProfileCommand
}) {
	const txService = new DrizzleTransactionService(
		opts.db,
		new AsyncLocalStorage<DrizzleTx>()
	)

	const userRepository = new DrizzleUserRepository(txService)
	const passwordCredentialRepository = new DrizzlePasswordCredentialRepository(
		txService
	)
	const oauthAccountRepository = new DrizzleOAuthAccountRepository(txService)
	const oauthStateRepository = new DrizzleOAuthStateRepository(txService)
	const refreshTokenRepository = new DrizzleRefreshTokenRepository(txService)
	const profileRepository = new DrizzleProfileRepository(txService)

	const integrationBus = new IntegrationEventBus()
	const tokenService = new FakeJwtService()
	const tokenGen = new FakeJwtTokenGenerator()

	const authModule = buildAuthModule({
		userRepository,
		passwordCredentialRepository,
		oauthAccountRepository,
		oauthStateRepository,
		refreshTokenRepository,
		hashGenerator: new FakeHashGenerator(),
		hashVerifier: { verify: async () => true } as never,
		jwtService: tokenService as unknown as TokenService,
		tokenGenerator: tokenGen as unknown as TokenService,
		oauthProviderService: new OAuthProviderService([]),
		integrationBus,
	})

	const profileModuleBuilt = buildProfileModule({
		integrationBus,
		profileRepository,
	})

	const profileModule: ProfileModule = opts.overrideCreateProfile
		? {
				...profileModuleBuilt,
				commands: {
					...profileModuleBuilt.commands,
					createProfile: opts.overrideCreateProfile,
				},
			}
		: profileModuleBuilt

	const registrationFeature = buildRegistrationFeature({
		txRunner: txService,
		authModule,
		profileModule,
		integrationBus,
	})

	const app = createApp()
	app.register(async instance => {
		registerRegistrationRoutes({
			app: instance.withTypeProvider<ZodTypeProvider>(),
			registrationFeature,
			authModule,
		})
	})

	return { app, integrationBus }
}

describe('POST /register (integration)', () => {
	let app: HttpApp
	let db: DrizzleClient
	let registrationCompletedSubscriber: Mock<
		(event: RegistrationCompleted) => Promise<void>
	>

	beforeAll(async () => {
		initializeClock()
		initializeIdGenerator('v7')

		db = createDrizzle(inject('databaseUrl'))

		const built = buildApp({ db })
		app = built.app
		registrationCompletedSubscriber = vi.fn(
			async (_event: RegistrationCompleted) => {}
		)
		built.integrationBus.subscribe(
			RegistrationCompleted,
			registrationCompletedSubscriber
		)

		await app.ready()
	})

	afterEach(async () => {
		await resetDb(db)
		registrationCompletedSubscriber.mockClear()
	})

	afterAll(async () => {
		await app.close()
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('retorna 200, persiste user + credential + profile e publica RegistrationCompleted', async () => {
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

		const profiles = await db.select().from(profileTable)
		expect(profiles).toHaveLength(1)
		expect(profiles[0]).toMatchObject({
			userId: users[0].id,
			name: baseBody.email.split('@')[0],
			phone: null,
		})

		expect(registrationCompletedSubscriber).toHaveBeenCalledTimes(1)
		const event = registrationCompletedSubscriber.mock.calls[0][0]
		expect(event).toBeInstanceOf(RegistrationCompleted)
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
		const profiles = await db.select().from(profileTable)
		expect(profiles).toHaveLength(0)
		expect(registrationCompletedSubscriber).not.toHaveBeenCalled()
	})

	describe('rollback atômico quando createProfile falha', () => {
		let isolatedApp: HttpApp

		beforeAll(async () => {
			const failingCommand = new (class extends CreateProfileCommand {
				async execute() {
					return failure(new ProfileAlreadyExistsError())
				}
			})()
			const built = buildApp({ db, overrideCreateProfile: failingCommand })
			isolatedApp = built.app
			await isolatedApp.ready()
		})

		afterAll(async () => {
			await isolatedApp.close()
		})

		it('retorna 409, faz rollback do User e da PasswordCredential criados no auth', async () => {
			const response = await isolatedApp.inject({
				method: 'POST',
				url: '/register',
				payload: { ...baseBody, email: 'rollback@example.com' },
			})

			expect(response.statusCode).toBe(409)
			expect(response.json()).toEqual({ error: 'Profile already exists' })

			const users = await db.select().from(userTable)
			expect(users).toHaveLength(0)

			const credentials = await db.select().from(passwordCredential)
			expect(credentials).toHaveLength(0)

			const profiles = await db.select().from(profileTable)
			expect(profiles).toHaveLength(0)
		})
	})
})
