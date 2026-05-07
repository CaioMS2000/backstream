import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { UniqueId } from '@backstream/core/unique-id'
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from 'vitest'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import {
	type UserSummary,
	UserSummaryQuery,
} from '../../../auth/public/queries/user-summary-query'
import { StreamerOnboarded } from '../../public/events/streamer-onboarded'
import { InMemoryStreamerRepository } from '../../test/in-memory-streamer-repository'
import {
	AlreadyOnboardedError,
	NotAStreamerError,
	SlugAlreadyTakenError,
	UserNotFoundError,
} from '../@errors'
import { OnboardStreamerUseCase } from './onboard-streamer-use-case'

class FakeUserSummaryQuery extends UserSummaryQuery {
	private readonly users = new Map<UniqueId, UserSummary>()

	put(summary: UserSummary): void {
		this.users.set(summary.id, summary)
	}

	async findById(userId: UniqueId): Promise<UserSummary | null> {
		return this.users.get(userId) ?? null
	}
}

describe('OnboardStreamerUseCase', () => {
	let streamerRepo: InMemoryStreamerRepository
	let userSummaryQuery: FakeUserSummaryQuery
	let domainEvents: DomainEventDispatcher
	let integrationBus: IntegrationEventBus
	let onboardedSubscriber: Mock<(event: StreamerOnboarded) => Promise<void>>
	let sut: OnboardStreamerUseCase

	const userId = UniqueId('user-1')
	const baseInput = {
		userId,
		displayName: 'Caio Streamer',
		slug: 'caiostream',
		pixKey: 'caio@example.com',
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		streamerRepo = new InMemoryStreamerRepository()
		userSummaryQuery = new FakeUserSummaryQuery()
		domainEvents = new DomainEventDispatcher()
		integrationBus = new IntegrationEventBus()
		onboardedSubscriber = vi.fn(async (_event: StreamerOnboarded) => {})
		integrationBus.subscribe(StreamerOnboarded, onboardedSubscriber)

		userSummaryQuery.put({
			id: userId,
			email: 'caio@example.com',
			roles: ['streamer'],
			isRevoked: false,
		})

		sut = new OnboardStreamerUseCase({
			streamerRepository: streamerRepo,
			userSummaryQuery,
			domainEvents,
			integrationBus,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('cria streamer e publica StreamerOnboarded com role válida e slug livre', async () => {
		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		expect(streamerRepo.items).toHaveLength(1)
		expect(streamerRepo.items[0].props.slug).toBe(baseInput.slug)
		expect(streamerRepo.items[0].props.userId).toBe(userId)

		expect(onboardedSubscriber).toHaveBeenCalledTimes(1)
		const event = onboardedSubscriber.mock.calls[0]?.[0] as StreamerOnboarded
		expect(event).toBeInstanceOf(StreamerOnboarded)
		expect(event.userId).toBe(userId)
		expect(event.slug).toBe(baseInput.slug)
		expect(event.displayName).toBe(baseInput.displayName)
	})

	it('falha com UserNotFoundError quando o user não existe', async () => {
		const result = await sut.execute({
			...baseInput,
			userId: UniqueId('inexistente'),
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(UserNotFoundError)
		}
		expect(streamerRepo.items).toHaveLength(0)
		expect(onboardedSubscriber).not.toHaveBeenCalled()
	})

	it('falha com UserNotFoundError quando o user está revogado', async () => {
		userSummaryQuery.put({
			id: userId,
			email: 'caio@example.com',
			roles: ['streamer'],
			isRevoked: true,
		})

		const result = await sut.execute(baseInput)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(UserNotFoundError)
		}
		expect(onboardedSubscriber).not.toHaveBeenCalled()
	})

	it('falha com NotAStreamerError quando role não inclui streamer', async () => {
		userSummaryQuery.put({
			id: userId,
			email: 'caio@example.com',
			roles: ['donor'],
			isRevoked: false,
		})

		const result = await sut.execute(baseInput)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(NotAStreamerError)
		}
		expect(streamerRepo.items).toHaveLength(0)
		expect(onboardedSubscriber).not.toHaveBeenCalled()
	})

	it('falha com AlreadyOnboardedError quando já existe streamer pro user', async () => {
		await sut.execute(baseInput)
		onboardedSubscriber.mockClear()

		const result = await sut.execute({
			...baseInput,
			slug: 'outro-slug',
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(AlreadyOnboardedError)
		}
		expect(streamerRepo.items).toHaveLength(1)
		expect(onboardedSubscriber).not.toHaveBeenCalled()
	})

	it('falha com SlugAlreadyTakenError quando slug já existe', async () => {
		const otherUserId = UniqueId('user-2')
		userSummaryQuery.put({
			id: otherUserId,
			email: 'other@example.com',
			roles: ['streamer'],
			isRevoked: false,
		})
		await sut.execute(baseInput)
		onboardedSubscriber.mockClear()

		const result = await sut.execute({
			...baseInput,
			userId: otherUserId,
		})

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(SlugAlreadyTakenError)
		}
		expect(streamerRepo.items).toHaveLength(1)
		expect(onboardedSubscriber).not.toHaveBeenCalled()
	})

	it('drena domain events do aggregate após o dispatch', async () => {
		await sut.execute(baseInput)

		expect(streamerRepo.items[0].events).toHaveLength(0)
	})
})
