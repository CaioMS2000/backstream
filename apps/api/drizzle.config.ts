import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	out: './drizzle',
	schema: [
		// './src/modules/auth/infrastructure/database/schemas/index.ts',
		// './src/modules/auth/infrastructure/database/schemas/*.ts'',
		'./src/modules/**/infrastructure/database/schemas/*.ts',
	],
	dialect: 'postgresql',
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
})
