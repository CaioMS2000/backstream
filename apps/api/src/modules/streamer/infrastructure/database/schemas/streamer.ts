import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const streamer = pgTable('streamer', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull().unique(),
	displayName: text('display_name').notNull(),
	slug: text('slug').notNull().unique(),
	pixKey: text('pix_key').unique(),
	updatedAt: timestamp('updated_at'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type StreamerDrizzleModel = typeof streamer.$inferSelect
