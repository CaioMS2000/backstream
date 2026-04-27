import type { DomainEvent } from '@backstream/core/events/domain-event'
import type { UniqueId } from '@backstream/core/unique-id'

export class PayoutChanged implements DomainEvent {
	constructor(
		readonly aggregateId: UniqueId,
		readonly occurredAt: Date
	) {}
}
