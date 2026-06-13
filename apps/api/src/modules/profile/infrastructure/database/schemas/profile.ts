import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const profile = pgTable('profile', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull().unique(),
	name: text('name').notNull(),
	username: text('username').notNull().unique(),
	phone: text('phone').unique(),
	avatarUrl: text('avatar_url'),
	updatedAt: timestamp('updated_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type ProfileDrizzleModel = typeof profile.$inferSelect
