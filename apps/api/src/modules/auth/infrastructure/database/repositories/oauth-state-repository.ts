import {
	OAuthStateData,
	OAuthStateRepository,
} from '@/modules/auth/application/repositories/oauth-state-repository'
import type { DrizzleClient } from '@/lib/drizzle'
import { generateId } from '@/shared/infrastructure/id-generator'
import { oauthState } from '../schemas'
import { eq } from 'drizzle-orm'
import { OauthStateMapper } from '../mappers/oauth-state-mapper'

export class DrizzleOAuthStateRepository extends OAuthStateRepository {
	constructor(private db: DrizzleClient) {
		super()
	}

	async save(
		state: string,
		data: OAuthStateData,
		expiresInSeconds: number
	): Promise<void> {
		await this.db.insert(oauthState).values({
			id: await generateId(),
			codeVerifier: data.codeVerifier,
			provider: data.provider,
			state,
			roles: [data.role],
			expiresInSeconds: expiresInSeconds,
		})
	}

	async findAndDelete(state: string): Promise<OAuthStateData | null> {
		const record = await this.db.query.oauthState.findFirst({
			where: (table, { eq }) => eq(table.state, state),
		})

		if (!record) return null

		await this.db.delete(oauthState).where(eq(oauthState.state, state))

		return OauthStateMapper.toDomain(record)
	}
}
