import { DomainEventDispatcher, UniqueId } from '@backstream/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Phone } from '@/shared/domain'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { ProfileUpdated } from '../../domain/events/profile-updated'
import { Profile } from '../../domain/profile'
import { InMemoryProfileRepository } from '../../test/in-memory-profile-repository'
import { PhoneAlreadyRegisteredError } from '../@errors'
import { ProfileNotFoundError } from '../@errors/profile-not-found-error'
import { UpdateProfileUseCase } from './update-profile-use-case'

describe('UpdateProfileUseCase', () => {
	let profileRepo: InMemoryProfileRepository
	let domainEvents: DomainEventDispatcher
	let sut: UpdateProfileUseCase

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

		sut = new UpdateProfileUseCase({
			profileRepository: profileRepo,
			domainEvents,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	function seedProfile(opts: {
		userId: string
		name?: string
		phone?: string | null
	}): Profile {
		const phoneResult = Phone.createOptional(opts.phone ?? null)
		if (phoneResult.isFailure()) {
			throw new Error(`seed inválido: ${phoneResult.value.message}`)
		}

		const profile = Profile.__create({
			id: UniqueId(`profile-${opts.userId}`),
			userId: UniqueId(opts.userId),
			name: opts.name ?? 'Seeded Profile',
			phone: phoneResult.value,
			createdAt: new Date(),
			updatedAt: null,
		})

		profileRepo.profiles.push(profile)
		return profile
	}

	it('deve falhar com ProfileNotFoundError quando o profile não existe', async () => {
		const result = await sut.execute(baseInput)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(ProfileNotFoundError)
		}
	})

	it('deve atualizar nome e telefone de um profile existente', async () => {
		seedProfile({ userId: baseInput.userId, name: 'Nome Antigo', phone: null })

		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.profile.name).toBe(baseInput.name)
			expect(result.value.profile.phone?.value).toBe(baseInput.phone)
			expect(result.value.profile.updatedAt).not.toBeNull()
		}
	})

	it('deve falhar com InvalidValueError quando o telefone é inválido', async () => {
		seedProfile({ userId: baseInput.userId })

		const result = await sut.execute({ ...baseInput, phone: '123' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidValueError)
		}
	})

	it('deve falhar com PhoneAlreadyRegisteredError quando o telefone pertence a outro usuário', async () => {
		seedProfile({ userId: baseInput.userId, phone: null })
		seedProfile({ userId: 'user-2', phone: baseInput.phone })

		const result = await sut.execute(baseInput)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(PhoneAlreadyRegisteredError)
		}
	})

	it('deve permitir atualizar mantendo o próprio telefone', async () => {
		seedProfile({ userId: baseInput.userId, phone: baseInput.phone })

		const result = await sut.execute({ ...baseInput, name: 'Nome Novo' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.profile.name).toBe('Nome Novo')
			expect(result.value.profile.phone?.value).toBe(baseInput.phone)
		}
	})

	it('deve disparar o domain event ProfileUpdated', async () => {
		seedProfile({ userId: baseInput.userId })

		const handler = vi.fn(async (_event: ProfileUpdated) => {})
		domainEvents.register(ProfileUpdated, handler)

		await sut.execute(baseInput)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0]?.[0]).toBeInstanceOf(ProfileUpdated)
	})

	it('deve drenar os domain events do aggregate após o dispatch', async () => {
		seedProfile({ userId: baseInput.userId })

		await sut.execute(baseInput)

		expect(profileRepo.profiles[0].events).toHaveLength(0)
	})
})
