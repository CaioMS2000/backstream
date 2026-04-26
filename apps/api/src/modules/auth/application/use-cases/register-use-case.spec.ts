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
import { UserRegistered } from '../../contracts/events/user-registered'
import { UserCreated } from '../../domain/events/user-created'
import { InMemoryPasswordCredentialRepository } from '../../test/in-memory-password-credential-repository'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import {
	EmailAlreadyRegisteredError,
	PhoneAlreadyRegisteredError,
} from '../@errors'
import { HashGenerator } from '../cryptography/hash-generator'
import { RegisterUseCase } from './register-use-case'

class FakeHashGenerator extends HashGenerator {
	async hash(plain: string): Promise<string> {
		return `hashed:${plain}`
	}
}

describe('RegisterUseCase', () => {
	let userRepo: InMemoryUserRepository
	let passwordCredentialRepo: InMemoryPasswordCredentialRepository
	let domainEvents: DomainEventDispatcher
	let integrationBus: IntegrationEventBus
	let userRegisteredSubscriber: Mock<(event: UserRegistered) => Promise<void>>
	let sut: RegisterUseCase

	const baseInput = {
		name: 'Caio Marques',
		email: 'caio@example.com',
		password: 'secret-password',
		phone: '5511987654321',
		role: 'viewer' as const,
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		userRepo = new InMemoryUserRepository()
		passwordCredentialRepo = new InMemoryPasswordCredentialRepository()
		domainEvents = new DomainEventDispatcher()
		integrationBus = new IntegrationEventBus()
		userRegisteredSubscriber = vi.fn(async (_event: UserRegistered) => {})
		integrationBus.subscribe(UserRegistered, userRegisteredSubscriber)

		sut = new RegisterUseCase({
			userRepository: userRepo,
			passwordCredentialRepository: passwordCredentialRepo,
			hashGenerator: new FakeHashGenerator(),
			domainEvents,
			integrationBus,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('deve registrar novo usuário, salvar credencial e publicar UserRegistered', async () => {
		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.user.email).toBe(baseInput.email)
			expect(result.value.user.roles).toEqual([baseInput.role])
		}

		expect(userRepo.items).toHaveLength(1)
		expect(passwordCredentialRepo.items).toHaveLength(1)
		expect(passwordCredentialRepo.items[0].userId).toBe(userRepo.items[0].id)

		expect(userRegisteredSubscriber).toHaveBeenCalledTimes(1)
		const event = userRegisteredSubscriber.mock.calls[0][0] as UserRegistered
		expect(event).toBeInstanceOf(UserRegistered)
		expect(event.userId).toBe(userRepo.items[0].id)
		expect(event.email).toBe(baseInput.email)
	})

	it('deve drenar os domain events do aggregate após o dispatch', async () => {
		await sut.execute(baseInput)

		expect(userRepo.items[0].events).toHaveLength(0)
	})

	it('deve falhar com EmailAlreadyRegisteredError quando o e-mail já existe', async () => {
		await sut.execute(baseInput)
		userRegisteredSubscriber.mockClear()

		const result = await sut.execute({
			...baseInput,
			phone: '5511999998888',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(EmailAlreadyRegisteredError)
		}
		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
	})

	it('deve falhar com PhoneAlreadyRegisteredError quando o telefone já existe', async () => {
		await sut.execute(baseInput)
		userRegisteredSubscriber.mockClear()

		const result = await sut.execute({
			...baseInput,
			email: 'outro@example.com',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(PhoneAlreadyRegisteredError)
		}
		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
	})

	it('deve falhar com InvalidValueError quando o e-mail é inválido', async () => {
		const result = await sut.execute({ ...baseInput, email: 'not-an-email' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidValueError)
		}
		expect(userRepo.items).toHaveLength(0)
		expect(passwordCredentialRepo.items).toHaveLength(0)
		expect(userRegisteredSubscriber).not.toHaveBeenCalled()
	})

	it('handler de domain event registrado no auth recebe UserCreated', async () => {
		const handler = vi.fn(async (_event: UserCreated) => {})
		domainEvents.register(UserCreated, handler)

		await sut.execute(baseInput)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(UserCreated)
	})
})
