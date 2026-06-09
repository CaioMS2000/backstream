import type { IntegrationEvent } from '@backstream/core/events/integration-event'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IntegrationBusAfterCommit } from './integration-bus-after-commit'

class FakeEvent implements IntegrationEvent {
	readonly occurredAt = new Date()
	constructor(readonly label: string) {}
}

describe('IntegrationBusAfterCommit', () => {
	let bus: IntegrationEventBus
	let publishSpy: ReturnType<typeof vi.spyOn>
	let sut: IntegrationBusAfterCommit

	beforeEach(() => {
		bus = new IntegrationEventBus()
		publishSpy = vi.spyOn(bus, 'publish')
		sut = new IntegrationBusAfterCommit(bus)
	})

	it('não publica no bus ao apenas enfileirar', () => {
		sut.enqueue(new FakeEvent('a'))
		sut.enqueue(new FakeEvent('b'))

		expect(publishSpy).not.toHaveBeenCalled()
	})

	it('publica todos os eventos na ordem de enfileiramento ao dar flush', async () => {
		const first = new FakeEvent('first')
		const second = new FakeEvent('second')

		sut.enqueue(first)
		sut.enqueue(second)
		await sut.flush()

		expect(publishSpy).toHaveBeenCalledTimes(2)
		expect(publishSpy.mock.calls[0]?.[0]).toBe(first)
		expect(publishSpy.mock.calls[1]?.[0]).toBe(second)
	})

	it('não publica nada quando o buffer está vazio', async () => {
		await sut.flush()

		expect(publishSpy).not.toHaveBeenCalled()
	})
})
