import { describe, expect, it } from 'vitest'
import { AggregateRoot } from './aggregate-root'
import type { DomainEvent } from './events/domain-event'
import { DomainEventDispatcher } from './events/domain-event-dispatcher'
import { UniqueId } from './unique-id'

class TestEvent implements DomainEvent {
	constructor(
		readonly aggregateId: UniqueId,
		readonly occurredAt: Date
	) {}
}

class TestAggregate extends AggregateRoot {
	emit(event: DomainEvent): void {
		this.addEvent(event)
	}
}

describe('AggregateRoot', () => {
	it('starts with no events', () => {
		const aggregate = new TestAggregate(UniqueId('agg-1'))
		expect(aggregate.events).toHaveLength(0)
	})

	it('accumulates events through addEvent', () => {
		const aggregate = new TestAggregate(UniqueId('agg-1'))
		aggregate.emit(new TestEvent(aggregate.id, new Date()))
		aggregate.emit(new TestEvent(aggregate.id, new Date()))

		expect(aggregate.events).toHaveLength(2)
	})

	it('drains events after dispatchDomainEvents is called', async () => {
		const aggregate = new TestAggregate(UniqueId('agg-1'))
		const dispatcher = new DomainEventDispatcher()
		aggregate.emit(new TestEvent(aggregate.id, new Date()))

		const before = aggregate.events
		await aggregate.dispatchDomainEvents(dispatcher)
		const after = aggregate.events

		expect(before).toHaveLength(1)
		expect(after).toHaveLength(0)
	})

	it('keeps separate state per aggregate instance', () => {
		const a = new TestAggregate(UniqueId('agg-a'))
		const b = new TestAggregate(UniqueId('agg-b'))

		a.emit(new TestEvent(a.id, new Date()))

		expect(a.events).toHaveLength(1)
		expect(b.events).toHaveLength(0)
	})
})
