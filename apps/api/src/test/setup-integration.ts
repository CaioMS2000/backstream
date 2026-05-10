import { randomUUID } from 'node:crypto'
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'
import type { TestProject } from 'vitest/node'

config({ path: '.env' })
if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL ausente em .env')
}

const ADMIN_DATABASE_URL = process.env.DATABASE_URL

const SCHEMA_NAME = `test_${randomUUID().replaceAll('-', '_')}`

function buildSchemaUrl(adminUrl: string, schema: string): string {
	const url = new URL(adminUrl)
	url.searchParams.set('options', `-c search_path=${schema}`)
	return url.toString()
}

export async function setup({ provide }: TestProject) {
	const adminClient = new Client({ connectionString: ADMIN_DATABASE_URL })
	await adminClient.connect()
	await adminClient.query(`CREATE SCHEMA "${SCHEMA_NAME}"`)
	await adminClient.end()

	const schemaUrl = buildSchemaUrl(ADMIN_DATABASE_URL, SCHEMA_NAME)

	const migrationClient = new Client({ connectionString: schemaUrl })
	await migrationClient.connect()
	await migrate(drizzle(migrationClient), {
		migrationsFolder: './drizzle',
		migrationsSchema: SCHEMA_NAME,
	})
	await migrationClient.end()

	provide('databaseUrl', schemaUrl)
}

export async function teardown() {
	const adminClient = new Client({ connectionString: ADMIN_DATABASE_URL })
	await adminClient.connect()
	await adminClient.query(`DROP SCHEMA IF EXISTS "${SCHEMA_NAME}" CASCADE`)
	await adminClient.end()
}

declare module 'vitest' {
	export interface ProvidedContext {
		databaseUrl: string
	}
}
