import type { IntegrationEvent } from './integration-event'
import { TypedEventChannel } from './typed-event-channel'

type Ctor<T> = new (...args: never[]) => T
type Subscriber<E extends IntegrationEvent> = (event: E) => Promise<void>

export class IntegrationEventBus {
	private readonly channel = new TypedEventChannel<IntegrationEvent>()

	subscribe<E extends IntegrationEvent>(
		type: Ctor<E>,
		subscriber: Subscriber<E>
	): void {
		this.channel.on(type, subscriber)
	}

	async publish<E extends IntegrationEvent>(event: E): Promise<void> {
		await this.channel.emit(event)
	}
}
