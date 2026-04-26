import type { UniqueId } from '../unique-id'

export interface DomainEvent {
	readonly occurredAt: Date
	readonly aggregateId: UniqueId
}
