export abstract class IncrementalIdGenerator {
	abstract generate(): Promise<number>
}
