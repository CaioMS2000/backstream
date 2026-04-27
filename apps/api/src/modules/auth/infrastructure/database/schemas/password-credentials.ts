import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const passwordCredential = pgTable('password_credential', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull(),
	passwordHash: text('password_hash').notNull(),
	revokedAt: timestamp('revoked_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type PasswordCredentialDrizzleModel =
	typeof passwordCredential.$inferSelect
