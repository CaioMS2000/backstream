import type { DomainEvent } from '@backstream/core/events/domain-event'
import type { UniqueId } from '@backstream/core/unique-id'

export class SlugChanged implements DomainEvent {
	constructor(
		readonly aggregateId: UniqueId,
		readonly previousSlug: string,
		readonly newSlug: string,
		readonly occurredAt: Date
	) {}
}
