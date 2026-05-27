import type { DrizzleClient } from '@/lib/drizzle'

export type DrizzleTx = Parameters<
	Parameters<DrizzleClient['transaction']>[0]
>[0]

export abstract class DbContext {
	abstract current(): DrizzleClient | DrizzleTx
}
