import {
	OAuthStateData,
	OAuthStateRepository,
} from '@/modules/auth/application/repositories/oauth-state-repository'
import { drizzle } from '@/lib/drizzle'
import { generateId } from '@/shared/infrastructure/id-generator'
import { oauthState } from '../schemas'
import { eq } from 'drizzle-orm'
import { OauthStateMapper } from '../mappers/oauth-state-mapper'

export class DrizzleOAuthStateRepository extends OAuthStateRepository {
	async save(
		state: string,
		data: OAuthStateData,
		expiresInSeconds: number
	): Promise<void> {
		await drizzle.insert(oauthState).values({
			id: await generateId(),
			codeVerifier: data.codeVerifier,
			provider: data.provider,
			state,
			roles: [data.role],
			expiresInSeconds: expiresInSeconds,
		})
	}

	async findAndDelete(state: string): Promise<OAuthStateData | null> {
		const record = await drizzle.query.oauthState.findFirst({
			where: (table, { eq }) => eq(table.state, state),
		})

		if (!record) return null

		await drizzle.delete(oauthState).where(eq(oauthState.state, state))

		return OauthStateMapper.toDomain(record)
	}
}
