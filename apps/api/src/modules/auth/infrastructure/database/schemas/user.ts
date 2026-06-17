import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { Role } from '../../../domain/role'

export const user = pgTable('user', {
	id: text('id').notNull().primaryKey(),
	email: text('email').notNull().unique(),
	roles: text('roles', { enum: Role }).array().notNull(),
	revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
})

export type UserDrizzleModel = typeof user.$inferSelect
