import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { Role } from '@/modules/auth/domain/role'

export const oauthState = pgTable('oauth_state', {
	id: text('id').notNull().primaryKey(),
	codeVerifier: text('code_verifier').notNull(),
	provider: text('provider').notNull(),
	state: text('state').notNull(),
	roles: text('roles', { enum: Role }).array().notNull(),
	expiresInSeconds: integer('expires_in_seconds').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type OauthStateDrizzleModel = typeof oauthState.$inferSelect
