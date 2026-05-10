import { sql } from 'drizzle-orm'
import type { DrizzleClient } from '@/lib/drizzle'

export async function resetDb(db: DrizzleClient): Promise<void> {
	const result = await db.execute<{ tablename: string }>(sql`
		SELECT tablename FROM pg_tables
		WHERE schemaname = current_schema()
		  AND tablename != '__drizzle_migrations'
	`)

	if (result.rows.length === 0) return

	const tableList = result.rows.map(r => `"${r.tablename}"`).join(', ')
	await db.execute(sql.raw(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`))
}
