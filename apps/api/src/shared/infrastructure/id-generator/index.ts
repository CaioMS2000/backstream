// apps/api/src/shared/infrastructure/id-generator/index.ts
import type { IdGenerator } from '@backstream/core/id-generator/id-generator'
import { UniqueId } from '@backstream/core/unique-id'
import { UUIDV4Generator } from './uuid-v4-generator'
import { UUIDV7Generator } from './uuid-v7-generator'

let impl: IdGenerator | null = null

export type IdGeneratorVersion = 'v4' | 'v7'

export function initializeIdGenerator(
	version: IdGeneratorVersion = 'v7'
): void {
	if (impl !== null) {
		throw new Error(
			'IdGenerator já inicializado. Chame apenas uma vez no bootstrap.'
		)
	}

	switch (version) {
		case 'v4':
			impl = new UUIDV4Generator()
			break
		case 'v7':
			impl = new UUIDV7Generator()
			break
	}
}

export async function generateId(prefix?: string): Promise<UniqueId> {
	if (impl === null) {
		throw new Error(
			'IdGenerator não inicializado. Chame initializeIdGenerator no bootstrap.'
		)
	}
	return impl.generate(prefix)
}

export function __resetIdGeneratorForTests(): void {
	impl = null
}
