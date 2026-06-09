import type { IntegrationEvent } from '@backstream/core/events/integration-event'
import type { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'

/**
 * Buffer de integration events que só publica no bus real após o commit.
 *
 * Instância por execução (o buffer é por-transação): enfileira eventos com
 * `enqueue` durante a transação e chama `flush` depois que `txRunner.run`
 * resolve com sucesso. Subscribers rodam APÓS o commit e são aguardados —
 * se um handler lançar, a request falha embora os dados já estejam
 * persistidos. Ver docs/adr/0001-dispatch-de-eventos-pos-commit.md
 */
export class IntegrationBusAfterCommit {
	private readonly buffer: IntegrationEvent[] = []

	constructor(private readonly bus: IntegrationEventBus) {}

	enqueue(event: IntegrationEvent): void {
		this.buffer.push(event)
	}

	async flush(): Promise<void> {
		for (const event of this.buffer) {
			await this.bus.publish(event)
		}
	}
}
