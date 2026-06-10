import { AsyncLocalStorage } from 'node:async_hooks'
import { DrizzleClient } from '@/lib/drizzle'
import { DbContext, DrizzleTx } from './db-context'
import { TransactionRunner } from './transaction-runner'

export class DrizzleTransactionService
	extends TransactionRunner
	implements DbContext
{
	constructor(
		private readonly defaultDb: DrizzleClient,
		private readonly storage: AsyncLocalStorage<DrizzleTx>
	) {
		super()
	}

	async run<T>(callback: () => Promise<T>): Promise<T> {
		return this.defaultDb.transaction(async tx => {
			return this.storage.run(tx, callback)
		})
	}

	current() {
		return this.storage.getStore() ?? this.defaultDb
	}
}
