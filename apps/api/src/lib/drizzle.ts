import { drizzle as _drizzle } from 'drizzle-orm/node-postgres'
import 'dotenv/config'
import { env } from '@/config/env'
import * as authSchemas from '@/modules/auth/infrastructure/database/schemas'

export const drizzle = _drizzle(env.DATABASE_URL, {
	schema: {
		...authSchemas,
	},
})
