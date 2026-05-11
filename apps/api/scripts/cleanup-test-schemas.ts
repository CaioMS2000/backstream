import { config } from 'dotenv'
import { Client } from 'pg'

config({ path: '.env' })

const url = process.env.DATABASE_URL
if (!url) {
	console.error('DATABASE_URL ausente em .env')
	process.exit(1)
}

const client = new Client({ connectionString: url })
await client.connect()

try {
	const { rows } = await client.query<{ schema_name: string }>(
		`SELECT schema_name
		 FROM information_schema.schemata
		 WHERE schema_name LIKE 'test\\_%' ESCAPE '\\'
		    OR schema_name = 'drizzle'
		 ORDER BY schema_name`
	)

	if (rows.length === 0) {
		console.log('Nenhum schema órfão encontrado.')
	} else {
		for (const { schema_name } of rows) {
			await client.query(`DROP SCHEMA "${schema_name}" CASCADE`)
			console.log(`Dropped: ${schema_name}`)
		}
		console.log(`Total: ${rows.length}`)
	}
} finally {
	await client.end()
}
