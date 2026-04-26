import type { DomainEvent } from './domain-event'
import { TypedEventChannel } from './typed-event-channel'

type Ctor<T> = new (...args: never[]) => T
type Handler<E extends DomainEvent> = (event: E) => Promise<void>

export class DomainEventDispatcher {
	private readonly channel = new TypedEventChannel<DomainEvent>()

	register<E extends DomainEvent>(type: Ctor<E>, handler: Handler<E>): void {
		this.channel.on(type, handler)
	}

	async dispatch(event: DomainEvent): Promise<void> {
		await this.channel.emit(event)
	}

	async dispatchAll(events: readonly DomainEvent[]): Promise<void> {
		for (const event of events) {
			await this.dispatch(event)
		}
	}
}
