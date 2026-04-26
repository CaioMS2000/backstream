import { describe, expect, it, vi } from 'vitest'
import type { IntegrationEvent } from './integration-event'
import { IntegrationEventBus } from './integration-event-bus'

class EventA implements IntegrationEvent {
	constructor(
		readonly payload: string,
		readonly occurredAt: Date
	) {}
}

class EventB implements IntegrationEvent {
	constructor(readonly occurredAt: Date) {}
}

describe('IntegrationEventBus', () => {
	it('calls subscriber for matching event', async () => {
		const bus = new IntegrationEventBus()
		const subscriber = vi.fn(async () => {})
		bus.subscribe(EventA, subscriber)

		const event = new EventA('hello', new Date())
		await bus.publish(event)

		expect(subscriber).toHaveBeenCalledTimes(1)
		expect(subscriber).toHaveBeenCalledWith(event)
	})

	it('ignores events without subscribers', async () => {
		const bus = new IntegrationEventBus()
		const subscriber = vi.fn(async () => {})
		bus.subscribe(EventA, subscriber)

		await bus.publish(new EventB(new Date()))

		expect(subscriber).not.toHaveBeenCalled()
	})

	it('supports multiple subscribers for the same event type', async () => {
		const bus = new IntegrationEventBus()
		const first = vi.fn(async () => {})
		const second = vi.fn(async () => {})
		bus.subscribe(EventA, first)
		bus.subscribe(EventA, second)

		await bus.publish(new EventA('x', new Date()))

		expect(first).toHaveBeenCalledTimes(1)
		expect(second).toHaveBeenCalledTimes(1)
	})

	it('awaits async subscribers before resolving publish', async () => {
		const bus = new IntegrationEventBus()
		let completed = false
		bus.subscribe(EventA, async () => {
			await new Promise(resolve => setTimeout(resolve, 5))
			completed = true
		})

		await bus.publish(new EventA('x', new Date()))

		expect(completed).toBe(true)
	})

	it('keeps state isolated between separate instances', async () => {
		const busA = new IntegrationEventBus()
		const busB = new IntegrationEventBus()
		const subscriber = vi.fn(async () => {})
		busA.subscribe(EventA, subscriber)

		await busB.publish(new EventA('x', new Date()))

		expect(subscriber).not.toHaveBeenCalled()
	})
})
