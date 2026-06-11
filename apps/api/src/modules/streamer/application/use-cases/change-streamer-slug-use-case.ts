import type { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { failure, type Result, success } from '@backstream/core/result'
import type { UniqueId } from '@backstream/core/unique-id'
import { SlugAlreadyTakenError, StreamerNotFoundError } from '../@errors'
import type { StreamerRepository } from '../repositories/streamer-repository'

export type ChangeStreamerSlugUseCaseRequest = {
	userId: UniqueId
	slug: string
}

export type ChangeStreamerSlugUseCaseResponse = Result<
	StreamerNotFoundError | SlugAlreadyTakenError,
	void
>

type UseCaseProps = {
	streamerRepository: StreamerRepository
	domainEvents: DomainEventDispatcher
}

export class ChangeStreamerSlugUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: ChangeStreamerSlugUseCaseRequest
	): Promise<ChangeStreamerSlugUseCaseResponse> {
		const streamer = await this.props.streamerRepository.findByUserId(
			input.userId
		)

		if (!streamer) {
			return failure(StreamerNotFoundError)
		}

		if (input.slug !== streamer.props.slug.value) {
			const existingBySlug = await this.props.streamerRepository.findBySlug(
				input.slug
			)
			if (existingBySlug && existingBySlug.id !== streamer.id) {
				return failure(SlugAlreadyTakenError)
			}
		}

		streamer.changeSlug(input.slug)
		await this.props.streamerRepository.save(streamer)
		await streamer.dispatchDomainEvents(this.props.domainEvents)

		return success(undefined)
	}
}
