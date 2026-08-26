import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const streamer = pgTable('streamer', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id').notNull().unique(),
	displayName: text('display_name').notNull(),
	slug: text('slug').notNull().unique(),
	pixKey: text('pix_key').unique(),
	updatedAt: timestamp('updated_at', {
		withTimezone: true,
		mode: 'date',
	}).$onUpdate(() => new Date()),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
		.notNull()
		.defaultNow(),
})

export type StreamerDrizzleModel = typeof streamer.$inferSelect
