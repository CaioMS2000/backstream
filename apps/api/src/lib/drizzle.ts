import { drizzle as _drizzle } from 'drizzle-orm/node-postgres'
import 'dotenv/config'
import * as authSchemas from '@/modules/auth/infrastructure/database/schemas'

export function createDrizzle(url: string) {
	return _drizzle(url, {
		schema: {
			...authSchemas,
		},
	})
}

export type DrizzleClient = ReturnType<typeof createDrizzle>
