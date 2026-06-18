import type { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { failure, type Result, success } from '@backstream/core/result'
import type { UniqueId } from '@backstream/core/unique-id'
import { StreamerNotFoundError } from '../@errors'
import type { StreamerRepository } from '../repositories/streamer-repository'

export type UpdateStreamerPixKeyUseCaseRequest = {
	userId: UniqueId
	pixKey: string
}

export type UpdateStreamerPixKeyUseCaseResponse = Result<
	StreamerNotFoundError,
	void
>

type UseCaseProps = {
	streamerRepository: StreamerRepository
	domainEvents: DomainEventDispatcher
}

export class UpdateStreamerPixKeyUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: UpdateStreamerPixKeyUseCaseRequest
	): Promise<UpdateStreamerPixKeyUseCaseResponse> {
		const streamer = await this.props.streamerRepository.findByUserId(
			input.userId
		)

		if (!streamer) {
			return failure(StreamerNotFoundError)
		}

		streamer.updatePixKey(input.pixKey)
		await this.props.streamerRepository.update(streamer)
		await streamer.dispatchDomainEvents(this.props.domainEvents)

		return success(undefined)
	}
}
