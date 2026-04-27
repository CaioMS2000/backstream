import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const refreshToken = pgTable('refresh_token', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at'),
	revokedAt: timestamp('revoked_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type RefreshTokenDrizzleModel = typeof refreshToken.$inferSelect
