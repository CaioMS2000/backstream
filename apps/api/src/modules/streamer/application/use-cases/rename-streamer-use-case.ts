import type { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { failure, type Result, success } from '@backstream/core/result'
import type { UniqueId } from '@backstream/core/unique-id'
import { StreamerNotFoundError } from '../@errors'
import type { StreamerRepository } from '../repositories/streamer-repository'

export type RenameStreamerUseCaseRequest = {
	userId: UniqueId
	displayName: string
}

export type RenameStreamerUseCaseResponse = Result<StreamerNotFoundError, void>

type UseCaseProps = {
	streamerRepository: StreamerRepository
	domainEvents: DomainEventDispatcher
}

export class RenameStreamerUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: RenameStreamerUseCaseRequest
	): Promise<RenameStreamerUseCaseResponse> {
		const streamer = await this.props.streamerRepository.findByUserId(
			input.userId
		)

		if (!streamer) {
			return failure(StreamerNotFoundError)
		}

		streamer.rename(input.displayName)
		await this.props.streamerRepository.update(streamer)
		await streamer.dispatchDomainEvents(this.props.domainEvents)

		return success(undefined)
	}
}
