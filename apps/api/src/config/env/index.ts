import { config } from 'dotenv'
import { z } from 'zod'

const isTest = process.env.NODE_ENV === 'test'

config({
	path: isTest ? '.env.test' : '.env',
	override: !isTest,
})

export const envSchema = z.object({
	// Environment machine
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),

	// HTTP Server
	PORT: z.coerce.number().default(3333).catch(3333),
	AUTH_JWKS_URL: z.string(),

	// Auth
	JWT_PRIVATE_KEY: z.string(),
	JWT_PUBLIC_KEY: z.string(),

	// Database
	DATABASE_URL: z.string(),
})

const env = envSchema.parse(process.env)

export { env }
