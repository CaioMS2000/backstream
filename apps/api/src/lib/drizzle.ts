import { drizzle as _drizzle } from 'drizzle-orm/node-postgres'
import 'dotenv/config'
import * as authSchemas from '@/modules/auth/infrastructure/database/schemas'
import * as profileSchemas from '@/modules/profile/infrastructure/database/schemas'

export function createDrizzle(url: string) {
	return _drizzle(url, {
		schema: {
			...authSchemas,
			...profileSchemas,
		},
	})
}

export type DrizzleClient = ReturnType<typeof createDrizzle>
