import { IncrementalIdGenerator } from './incremental-id-generator'

export class DefaultIncrementalIdGenerator extends IncrementalIdGenerator {
	constructor(private LAST_GENERATED_ID = 0) {
		super()
	}

	private queue: Promise<any> = Promise.resolve()

	generate(): Promise<number> {
		// biome-ignore lint/suspicious/noAssignInExpressions: queue serialization
		return (this.queue = this.queue.then(() => {
			const id = ++this.LAST_GENERATED_ID
			return id
		}))
	}
}
