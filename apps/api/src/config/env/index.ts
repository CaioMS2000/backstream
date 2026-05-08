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

	// Auth
	AUTH_JWKS_URL: z.string(),
	JWT_PRIVATE_KEY: z.string(),
	JWT_PUBLIC_KEY: z.string(),
	// Auth - Google
	GOOGLE_CLIENT_ID: z.string().default('FAKE_GOOGLE_CLIENT_ID'),
	GOOGLE_CLIENT_SECRET: z.string().default('FAKE_GOOGLE_CLIENT_SECRET'),
	GOOGLE_REDIRECT_URI: z.string().default('FAKE_GOOGLE_REDIRECT_URI'),

	// Frontend
	FRONTEND_URL: z.url().default('http://localhost:3000'),

	// Database
	DATABASE_URL: z.string(),
})

const env = envSchema.parse(process.env)

export { env }
