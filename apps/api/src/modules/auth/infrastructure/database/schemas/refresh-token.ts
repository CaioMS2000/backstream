import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const refreshToken = pgTable('refresh_token', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date',
	}).notNull(),
	revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
	usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
})

export type RefreshTokenDrizzleModel = typeof refreshToken.$inferSelect
