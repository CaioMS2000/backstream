import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { Role } from '../../../domain/role'

export const user = pgTable('user', {
	id: text('id').notNull().primaryKey(),
	email: text('email').notNull().unique(),
	roles: text('roles', { enum: Role }).array().notNull(),
	revokedAt: timestamp('revoked_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type UserDrizzleModel = typeof user.$inferSelect
