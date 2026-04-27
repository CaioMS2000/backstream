import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { failure, Result, success } from '@backstream/core/result'
import type { UniqueId } from '@backstream/core/unique-id'
import { now } from '@/shared/infrastructure/clock'
import { UserSummaryQuery } from '../../../auth/contracts/queries/user-summary-query'
import { StreamerOnboarded } from '../../contracts/events/streamer-onboarded'
import { Streamer } from '../../domain/streamer'
import {
	AlreadyOnboardedError,
	NotAStreamerError,
	SlugAlreadyTakenError,
	UserNotFoundError,
} from '../@errors'
import { StreamerRepository } from '../repositories/streamer-repository'

export type OnboardStreamerUseCaseRequest = {
	userId: UniqueId
	displayName: string
	slug: string
	pixKey: string
}

export type OnboardStreamerUseCaseResponse = Result<
	| UserNotFoundError
	| NotAStreamerError
	| AlreadyOnboardedError
	| SlugAlreadyTakenError,
	{
		streamerId: UniqueId
		slug: string
	}
>

type UseCaseProps = {
	streamerRepository: StreamerRepository
	userSummaryQuery: UserSummaryQuery
	domainEvents: DomainEventDispatcher
	integrationBus: IntegrationEventBus
}

export class OnboardStreamerUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: OnboardStreamerUseCaseRequest
	): Promise<OnboardStreamerUseCaseResponse> {
		const userSummary = await this.props.userSummaryQuery.findById(input.userId)

		if (!userSummary || userSummary.isRevoked) {
			return failure(UserNotFoundError)
		}

		if (!userSummary.roles.includes('streamer')) {
			return failure(NotAStreamerError)
		}

		const existingByUser = await this.props.streamerRepository.findByUserId(
			input.userId
		)

		if (existingByUser) {
			return failure(AlreadyOnboardedError)
		}

		const existingBySlug = await this.props.streamerRepository.findBySlug(
			input.slug
		)

		if (existingBySlug) {
			return failure(SlugAlreadyTakenError)
		}

		const streamer = await Streamer.create({
			userId: input.userId,
			displayName: input.displayName,
			slug: input.slug,
			pixKey: input.pixKey,
			now: now(),
		})

		await this.props.streamerRepository.save(streamer)

		await streamer.dispatchDomainEvents(this.props.domainEvents)
		await this.props.integrationBus.publish(
			new StreamerOnboarded(
				streamer.id,
				streamer.props.userId,
				streamer.props.slug,
				streamer.props.displayName,
				now()
			)
		)

		return success({
			streamerId: streamer.id,
			slug: streamer.props.slug,
		})
	}
}
