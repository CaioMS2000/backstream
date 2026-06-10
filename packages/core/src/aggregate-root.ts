import type { DomainEvent } from './events/domain-event'
import type { DomainEventDispatcher } from './events/domain-event-dispatcher'
import type { UniqueId } from './unique-id'

export abstract class AggregateRoot {
	private _events: DomainEvent[] = []

	constructor(readonly id: UniqueId) {}

	protected addEvent(event: DomainEvent): void {
		this._events.push(event)
	}

	get events(): readonly DomainEvent[] {
		return this._events
	}

	async dispatchDomainEvents(dispatcher: DomainEventDispatcher): Promise<void> {
		const pending = this._events
		this._events = []
		await dispatcher.dispatchAll(pending)
	}
}
