import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { UniqueId } from '@backstream/core/unique-id'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Slug } from '@/shared/domain'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { Streamer } from '../../domain/streamer'
import { InMemoryStreamerRepository } from '../../test/in-memory-streamer-repository'
import { StreamerNotFoundError } from '../@errors'
import { RenameStreamerUseCase } from './rename-streamer-use-case'

describe('RenameStreamerUseCase', () => {
	let streamerRepo: InMemoryStreamerRepository
	let domainEvents: DomainEventDispatcher
	let sut: RenameStreamerUseCase

	const userId = UniqueId('user-1')

	beforeEach(async () => {
		initializeClock()
		initializeIdGenerator('v4')

		streamerRepo = new InMemoryStreamerRepository()
		domainEvents = new DomainEventDispatcher()

		const streamer = await Streamer.create({
			userId,
			displayName: 'Caio',
			slug: Slug.create('caio'),
		})
		streamerRepo.items.push(streamer)

		sut = new RenameStreamerUseCase({
			streamerRepository: streamerRepo,
			domainEvents,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('atualiza o displayName do streamer existente', async () => {
		const result = await sut.execute({ userId, displayName: 'Caio Marques' })

		expect(result.isSuccess()).toBe(true)
		expect(streamerRepo.items[0].props.displayName).toBe('Caio Marques')
	})

	it('falha com StreamerNotFoundError quando o user não tem streamer', async () => {
		const result = await sut.execute({
			userId: UniqueId('outro'),
			displayName: 'Outro',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(StreamerNotFoundError)
		}
	})
})
