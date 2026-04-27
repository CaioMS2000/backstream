import type { DomainEvent } from '@backstream/core/events/domain-event'
import type { UniqueId } from '@backstream/core/unique-id'

export class StreamerCreated implements DomainEvent {
	constructor(
		readonly aggregateId: UniqueId,
		readonly userId: UniqueId,
		readonly slug: string,
		readonly occurredAt: Date
	) {}
}
