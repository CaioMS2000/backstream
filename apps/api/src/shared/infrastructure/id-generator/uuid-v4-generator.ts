import { IdGenerator } from '@backstream/core/id-generator/id-generator'
import { UniqueId } from '@backstream/core/unique-id'
import { randomUUID } from 'node:crypto'

export class UUIDV4Generator extends IdGenerator {
	generate(prefix?: string): Promise<UniqueId> {
		const uuid = randomUUID()
		const id = prefix ? `${prefix}:${uuid}` : uuid

		return Promise.resolve(UniqueId(id))
	}
}
