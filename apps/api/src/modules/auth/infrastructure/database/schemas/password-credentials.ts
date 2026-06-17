import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const passwordCredential = pgTable('password_credential', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull(),
	passwordHash: text('password_hash').notNull(),
	revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
})

export type PasswordCredentialDrizzleModel =
	typeof passwordCredential.$inferSelect
