import { drizzle } from 'drizzle-orm/node-postgres'
import 'dotenv/config'
import { Pool } from 'pg'
import * as authSchemas from '@/modules/auth/infrastructure/database/schemas'
import * as profileSchemas from '@/modules/profile/infrastructure/database/schemas'

export function createDrizzle(url: string) {
	const pool = new Pool({
		connectionString: url,
		options: '-c timezone=UTC',
	})

	return drizzle(pool, {
		schema: {
			...authSchemas,
			...profileSchemas,
		},
	})
}

export type DrizzleClient = ReturnType<typeof createDrizzle>
