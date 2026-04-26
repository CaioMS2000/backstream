import { describe, expect, it, vi } from 'vitest'
import { UniqueId } from '../unique-id'
import type { DomainEvent } from './domain-event'
import { DomainEventDispatcher } from './domain-event-dispatcher'

class EventA implements DomainEvent {
	constructor(
		readonly aggregateId: UniqueId,
		readonly occurredAt: Date
	) {}
}

class EventB implements DomainEvent {
	constructor(
		readonly aggregateId: UniqueId,
		readonly occurredAt: Date
	) {}
}

describe('DomainEventDispatcher', () => {
	it('calls registered handler for matching event', async () => {
		const dispatcher = new DomainEventDispatcher()
		const handler = vi.fn(async () => {})
		dispatcher.register(EventA, handler)

		const event = new EventA(UniqueId('agg-1'), new Date())
		await dispatcher.dispatch(event)

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith(event)
	})

	it('ignores events without registered handlers', async () => {
		const dispatcher = new DomainEventDispatcher()
		const handler = vi.fn(async () => {})
		dispatcher.register(EventA, handler)

		await dispatcher.dispatch(new EventB(UniqueId('agg-1'), new Date()))

		expect(handler).not.toHaveBeenCalled()
	})

	it('calls multiple handlers registered for the same event type', async () => {
		const dispatcher = new DomainEventDispatcher()
		const first = vi.fn(async () => {})
		const second = vi.fn(async () => {})
		dispatcher.register(EventA, first)
		dispatcher.register(EventA, second)

		await dispatcher.dispatch(new EventA(UniqueId('agg-1'), new Date()))

		expect(first).toHaveBeenCalledTimes(1)
		expect(second).toHaveBeenCalledTimes(1)
	})

	it('dispatchAll calls handlers for every event in order', async () => {
		const dispatcher = new DomainEventDispatcher()
		const calls: string[] = []
		dispatcher.register(EventA, async () => {
			calls.push('A')
		})
		dispatcher.register(EventB, async () => {
			calls.push('B')
		})

		await dispatcher.dispatchAll([
			new EventA(UniqueId('agg-1'), new Date()),
			new EventB(UniqueId('agg-1'), new Date()),
			new EventA(UniqueId('agg-1'), new Date()),
		])

		expect(calls).toEqual(['A', 'B', 'A'])
	})

	it('keeps state isolated between separate instances', async () => {
		const dispatcherA = new DomainEventDispatcher()
		const dispatcherB = new DomainEventDispatcher()
		const handler = vi.fn(async () => {})
		dispatcherA.register(EventA, handler)

		await dispatcherB.dispatch(new EventA(UniqueId('agg-1'), new Date()))

		expect(handler).not.toHaveBeenCalled()
	})

	it('awaits async handlers before resolving', async () => {
		const dispatcher = new DomainEventDispatcher()
		let completed = false
		dispatcher.register(EventA, async () => {
			await new Promise(resolve => setTimeout(resolve, 5))
			completed = true
		})

		await dispatcher.dispatch(new EventA(UniqueId('agg-1'), new Date()))

		expect(completed).toBe(true)
	})
})
