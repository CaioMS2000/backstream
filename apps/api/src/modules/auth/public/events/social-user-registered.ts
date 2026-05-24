import type { IntegrationEvent } from '@backstream/core/events/integration-event'
import type { UniqueId } from '@backstream/core/unique-id'

export class SocialUserRegistered implements IntegrationEvent {
	constructor(
		readonly userId: UniqueId,
		readonly providerProfile: { name: string },
		readonly occurredAt: Date
	) {}
}
