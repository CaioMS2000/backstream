import type { DomainEvent } from '@backstream/core/events/domain-event'
import type { UniqueId } from '@backstream/core/unique-id'

export class ProfileCreated implements DomainEvent {
	constructor(
		readonly aggregateId: UniqueId,
		readonly userId: UniqueId,
		readonly name: string,
		readonly phone: string | null,
		readonly occurredAt: Date
	) {}
}
