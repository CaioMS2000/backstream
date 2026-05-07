import type { IntegrationEvent } from '@backstream/core/events/integration-event'
import type { UniqueId } from '@backstream/core/unique-id'

export class StreamerOnboarded implements IntegrationEvent {
	constructor(
		readonly streamerId: UniqueId,
		readonly userId: UniqueId,
		readonly slug: string,
		readonly displayName: string,
		readonly occurredAt: Date
	) {}
}
