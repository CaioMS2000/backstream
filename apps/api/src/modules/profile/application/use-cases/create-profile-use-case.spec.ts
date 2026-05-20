import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { ProfileCreated } from '../../domain/events/profile-created'
import { InMemoryProfileRepository } from '../../test/in-memory-profile-repository'
import { PhoneAlreadyRegisteredError } from '../@errors'
import { ProfileAlreadyExistsError } from '../@errors/profile-already-exists-error'
import { CreateProfileUseCase } from './create-profile-use-case'

describe('CreateProfileUseCase', () => {
	let profileRepo: InMemoryProfileRepository
	let domainEvents: DomainEventDispatcher
	let sut: CreateProfileUseCase

	const baseInput = {
		name: 'João Silva',
		phone: '5511987654321',
		userId: 'user-1',
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		profileRepo = new InMemoryProfileRepository()
		domainEvents = new DomainEventDispatcher()

		sut = new CreateProfileUseCase({
			profileRepository: profileRepo,
			domainEvents,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('deve criar um profile com input válido', async () => {
		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.profile.name).toBe(baseInput.name)
			expect(result.value.profile.phone?.value).toBe(baseInput.phone)
		}

		expect(profileRepo.profiles).toHaveLength(1)
	})

	it('deve criar um profile sem telefone quando phone é null', async () => {
		const result = await sut.execute({ ...baseInput, phone: null })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.profile.phone).toBeNull()
		}

		expect(profileRepo.profiles).toHaveLength(1)
	})

	it('deve falhar com ProfileAlreadyExistsError quando o usuário já tem profile', async () => {
		await sut.execute(baseInput)

		const result = await sut.execute({
			...baseInput,
			phone: '5511999998888',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(ProfileAlreadyExistsError)
		}
		expect(profileRepo.profiles).toHaveLength(1)
	})

	it('deve falhar com PhoneAlreadyRegisteredError quando o telefone já existe', async () => {
		await sut.execute(baseInput)

		const result = await sut.execute({
			...baseInput,
			userId: 'user-2',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(PhoneAlreadyRegisteredError)
		}
		expect(profileRepo.profiles).toHaveLength(1)
	})

	it('deve falhar com InvalidValueError quando o telefone é inválido', async () => {
		const result = await sut.execute({ ...baseInput, phone: '123' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidValueError)
		}
		expect(profileRepo.profiles).toHaveLength(0)
	})

	it('deve disparar o domain event ProfileCreated', async () => {
		const handler = vi.fn(async (_event: ProfileCreated) => {})
		domainEvents.register(ProfileCreated, handler)

		await sut.execute(baseInput)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(ProfileCreated)
	})

	it('deve drenar os domain events do aggregate após o dispatch', async () => {
		await sut.execute(baseInput)

		expect(profileRepo.profiles[0].events).toHaveLength(0)
	})
})
