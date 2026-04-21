import { uuidv7 } from 'uuidv7'
import { IdGenerator } from '@backstream/core/id-generator/id-generator'
import { UniqueId } from '@backstream/core/unique-id'

export class UUIDV7Generator extends IdGenerator {
	generate(prefix?: string): Promise<UniqueId> {
		const uuid = uuidv7()
		const id = prefix ? `${prefix}:${uuid}` : uuid

		return Promise.resolve(UniqueId(id))
	}
}
