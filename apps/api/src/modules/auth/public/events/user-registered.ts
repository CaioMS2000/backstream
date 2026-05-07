import type { IntegrationEvent } from '@backstream/core/events/integration-event'
import type { UniqueId } from '@backstream/core/unique-id'

export class UserRegistered implements IntegrationEvent {
	constructor(
		readonly userId: UniqueId,
		readonly email: string,
		readonly occurredAt: Date
	) {}
}
