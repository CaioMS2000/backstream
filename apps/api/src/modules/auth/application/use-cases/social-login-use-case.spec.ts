import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from 'vitest'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { SocialUserRegistered } from '../../public/events/social-user-registered'
import { UserRegistered } from '../../public/events/user-registered'
import { FakeJwtService } from '../../test/fake-jwt-service'
import { FakeJwtTokenGenerator } from '../../test/fake-jwt-token-generator'
import { InMemoryOAuthAccountRepository } from '../../test/in-memory-oauth-account-repository'
import { InMemoryRefreshTokenRepository } from '../../test/in-memory-refresh-token-repository'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import { seedUser } from '../../test/seed-user'
import { SocialLoginUseCase } from './social-login-use-case'

describe('SocialLoginUseCase', () => {
	let userRepo: InMemoryUserRepository
	let oauthAccountRepo: InMemoryOAuthAccountRepository
	let refreshTokenRepo: InMemoryRefreshTokenRepository
	let domainEvents: DomainEventDispatcher
	let integrationBus: IntegrationEventBus
	let userRegisteredSubscriber: Mock<(event: UserRegistered) => Promise<void>>
	let socialUserRegisteredSubscriber: Mock<
		(event: SocialUserRegistered) => Promise<void>
	>
	let sut: SocialLoginUseCase

	const baseInput = {
		provider: 'google',
		providerAccountId: 'google-123',
		email: 'user@example.com',
		name: 'Test User',
		role: 'donor' as const,
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		userRepo = new InMemoryUserRepository()
		oauthAccountRepo = new InMemoryOAuthAccountRepository()
		refreshTokenRepo = new InMemoryRefreshTokenRepository()
		domainEvents = new DomainEventDispatcher()
		integrationBus = new IntegrationEventBus()
		userRegisteredSubscriber = vi.fn(async (_event: UserRegistered) => {})
		integrationBus.subscribe(UserRegistered, userRegisteredSubscriber)
		socialUserRegisteredSubscriber = vi.fn(
			async (_event: SocialUserRegistered) => {}
		)
		integrationBus.subscribe(
			SocialUserRegistered,
			socialUserRegisteredSubscriber
		)

		sut = new SocialLoginUseCase({
			userRepository: userRepo,
			oauthAccountRepository: oauthAccountRepo,
			refreshTokenRepository: refreshTokenRepo,
			jwtService: new FakeJwtService(),
			tokenGenerator: new FakeJwtTokenGenerator(),
			domainEvents,
			integrationBus,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('deve logar usuário existente quando o provider já está vinculado', async () => {
		const user = await seedUser(userRepo, {
			email: baseInput.email,
			roles: ['donor'],
		})
		await oauthAccountRepo.save({
			userId: user.id,
			provider: baseInput.provider,
			providerAccountId: baseInput.providerAccountId,
		})

		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.userId).toBe(user.id)
			expect(result.value.accessToken).toBe('fake-access-token')
			expect(result.value.refreshToken).toBe('fake-refresh-token')
		}

		expect(oauthAccountRepo.items).toHaveLength(1)
		expect(userRepo.items).toHaveLength(1)
		expect(refreshTokenRepo.items).toHaveLength(1)
	})

	it('deve auto-vincular e logar quando já existe usuário com mesmo e-mail', async () => {
		const user = await seedUser(userRepo, {
			email: baseInput.email,
			roles: ['streamer'],
		})

		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.userId).toBe(user.id)
			expect(result.value.user.roles).toEqual(['streamer'])
		}

		expect(oauthAccountRepo.items).toHaveLength(1)
		expect(oauthAccountRepo.items[0]).toMatchObject({
			userId: user.id,
			provider: baseInput.provider,
			providerAccountId: baseInput.providerAccountId,
		})
		expect(userRepo.items).toHaveLength(1)
	})

	it('deve criar novo usuário (donor) quando não existe', async () => {
		const result = await sut.execute({ ...baseInput, role: 'donor' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(true)
			expect(result.value.user.roles).toEqual(['donor'])
			expect(result.value.user.email).toBe(baseInput.email)
		}

		expect(userRepo.items).toHaveLength(1)
		expect(userRepo.items[0].roles).toEqual(['donor'])
		expect(oauthAccountRepo.items).toHaveLength(1)
		expect(refreshTokenRepo.items).toHaveLength(1)

		expect(userRegisteredSubscriber).toHaveBeenCalledTimes(1)
		const event = userRegisteredSubscriber.mock.calls[0][0] as UserRegistered
		expect(event).toBeInstanceOf(UserRegistered)
		expect(event.userId).toBe(userRepo.items[0].id)
		expect(event.email).toBe(baseInput.email)

		expect(socialUserRegisteredSubscriber).toHaveBeenCalledTimes(1)
		const socialEvent = socialUserRegisteredSubscriber.mock
			.calls[0][0] as SocialUserRegistered
		expect(socialEvent).toBeInstanceOf(SocialUserRegistered)
		expect(socialEvent.userId).toBe(userRepo.items[0].id)
		expect(socialEvent.providerProfile.name).toBe(baseInput.name)
	})

	it('deve criar novo usuário (streamer) quando não existe', async () => {
		const result = await sut.execute({ ...baseInput, role: 'streamer' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(true)
			expect(result.value.user.roles).toEqual(['streamer'])
		}

		expect(userRepo.items[0].roles).toEqual(['streamer'])
	})

	it('deve retornar InvalidValueError quando o e-mail é inválido', async () => {
		const result = await sut.execute({ ...baseInput, email: 'not-an-email' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidValueError)
		}

		expect(userRepo.items).toHaveLength(0)
		expect(oauthAccountRepo.items).toHaveLength(0)
		expect(refreshTokenRepo.items).toHaveLength(0)
	})

	it('não deve publicar UserRegistered nem SocialUserRegistered quando logando usuário existente', async () => {
		const user = await seedUser(userRepo, {
			email: baseInput.email,
			roles: ['donor'],
		})
		await oauthAccountRepo.save({
			userId: user.id,
			provider: baseInput.provider,
			providerAccountId: baseInput.providerAccountId,
		})

		await sut.execute(baseInput)

		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
		expect(socialUserRegisteredSubscriber).not.toHaveBeenCalled()
	})

	it('não deve publicar SocialUserRegistered em auto-link por email', async () => {
		await seedUser(userRepo, {
			email: baseInput.email,
			roles: ['streamer'],
		})

		await sut.execute(baseInput)

		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
		expect(socialUserRegisteredSubscriber).not.toHaveBeenCalled()
	})
})
