export abstract class TransactionRunner {
	abstract run<T>(callback: () => Promise<T>): Promise<T>
}
