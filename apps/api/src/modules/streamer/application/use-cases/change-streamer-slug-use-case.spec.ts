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
import { SlugChanged } from '../../domain/events/slug-changed'
import { Streamer } from '../../domain/streamer'
import { InMemoryStreamerRepository } from '../../test/in-memory-streamer-repository'
import { SlugAlreadyTakenError, StreamerNotFoundError } from '../@errors'
import { ChangeStreamerSlugUseCase } from './change-streamer-slug-use-case'

describe('ChangeStreamerSlugUseCase', () => {
	let streamerRepo: InMemoryStreamerRepository
	let domainEvents: DomainEventDispatcher
	let sut: ChangeStreamerSlugUseCase

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

		sut = new ChangeStreamerSlugUseCase({
			streamerRepository: streamerRepo,
			domainEvents,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('atualiza o slug e dispara SlugChanged', async () => {
		const handler = vi.fn(async (_event: SlugChanged) => {})
		domainEvents.register(SlugChanged, handler)

		const result = await sut.execute({ userId, slug: 'caio-novo' })

		expect(result.isSuccess()).toBe(true)
		expect(streamerRepo.items[0].props.slug.value).toBe('caio-novo')
		expect(handler).toHaveBeenCalledTimes(1)
		const event = handler.mock.calls[0]?.[0]
		expect(event).toBeInstanceOf(SlugChanged)
		expect(event?.previousSlug).toBe('caio')
		expect(event?.newSlug).toBe('caio-novo')
	})

	it('falha com StreamerNotFoundError quando o user não tem streamer', async () => {
		const result = await sut.execute({
			userId: UniqueId('outro'),
			slug: 'outro-slug',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(StreamerNotFoundError)
		}
	})

	it('falha com SlugAlreadyTakenError quando outro streamer já usa o slug', async () => {
		const otherStreamer = Streamer.create({
			id: UniqueId('streamer-2'),
			userId: UniqueId('user-2'),
			displayName: 'Outro',
			slug: Slug.create('tomado'),
			now: now(),
		})
		streamerRepo.items.push(otherStreamer)

		const result = await sut.execute({ userId, slug: 'tomado' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(SlugAlreadyTakenError)
		}
		expect(streamerRepo.items[0].props.slug.value).toBe('caio')
	})

	it('é no-op quando o slug é igual ao atual', async () => {
		const handler = vi.fn(async (_event: SlugChanged) => {})
		domainEvents.register(SlugChanged, handler)

		const result = await sut.execute({ userId, slug: 'caio' })

		expect(result.isSuccess()).toBe(true)
		expect(handler).not.toHaveBeenCalled()
	})
})
