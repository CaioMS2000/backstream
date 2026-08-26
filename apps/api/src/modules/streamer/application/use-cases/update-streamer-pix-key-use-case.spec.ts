import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { UniqueId } from '@backstream/core/unique-id'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Slug } from '@/shared/domain'
import {
	__resetClockForTests,
	initializeClock,
	now,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { PayoutChanged } from '../../domain/events/payout-changed'
import { Streamer } from '../../domain/streamer'
import { InMemoryStreamerRepository } from '../../test/in-memory-streamer-repository'
import { StreamerNotFoundError } from '../@errors'
import { UpdateStreamerPixKeyUseCase } from './update-streamer-pix-key-use-case'

describe('UpdateStreamerPixKeyUseCase', () => {
	let streamerRepo: InMemoryStreamerRepository
	let domainEvents: DomainEventDispatcher
	let sut: UpdateStreamerPixKeyUseCase

	const userId = UniqueId('user-1')

	beforeEach(async () => {
		initializeClock()
		initializeIdGenerator('v4')

		streamerRepo = new InMemoryStreamerRepository()
		domainEvents = new DomainEventDispatcher()

		const streamer = Streamer.create({
			id: UniqueId('streamer-1'),
			userId,
			displayName: 'Caio',
			slug: Slug.create('caio'),
			now: now(),
		})
		streamerRepo.items.push(streamer)

		sut = new UpdateStreamerPixKeyUseCase({
			streamerRepository: streamerRepo,
			domainEvents,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('configura pixKey pela primeira vez e dispara PayoutChanged', async () => {
		const handler = vi.fn(async (_event: PayoutChanged) => {})
		domainEvents.register(PayoutChanged, handler)

		const result = await sut.execute({ userId, pixKey: 'caio@pix.com' })

		expect(result.isSuccess()).toBe(true)
		expect(streamerRepo.items[0].props.pixKey).toBe('caio@pix.com')
		expect(streamerRepo.items[0].canReceiveDonations()).toBe(true)
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('atualiza pixKey existente e dispara PayoutChanged', async () => {
		await sut.execute({ userId, pixKey: 'velho@pix.com' })

		const handler = vi.fn(async (_event: PayoutChanged) => {})
		domainEvents.register(PayoutChanged, handler)

		const result = await sut.execute({ userId, pixKey: 'novo@pix.com' })

		expect(result.isSuccess()).toBe(true)
		expect(streamerRepo.items[0].props.pixKey).toBe('novo@pix.com')
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('é no-op quando o pixKey é igual ao atual', async () => {
		await sut.execute({ userId, pixKey: 'caio@pix.com' })

		const handler = vi.fn(async (_event: PayoutChanged) => {})
		domainEvents.register(PayoutChanged, handler)

		const result = await sut.execute({ userId, pixKey: 'caio@pix.com' })

		expect(result.isSuccess()).toBe(true)
		expect(handler).not.toHaveBeenCalled()
	})

	it('falha com StreamerNotFoundError quando o user não tem streamer', async () => {
		const result = await sut.execute({
			userId: UniqueId('outro'),
			pixKey: 'pix@pix.com',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(StreamerNotFoundError)
		}
	})
})
