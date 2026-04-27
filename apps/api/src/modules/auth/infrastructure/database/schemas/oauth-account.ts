import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const oauthAccount = pgTable('oauth_account', {
	id: text('id').notNull().primaryKey(),
	userId: text('userId').notNull(),
	provider: text('provider').notNull(),
	providerAccountId: text('provider_account_id').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type OauthAccountDrizzleModel = typeof oauthAccount.$inferSelect
