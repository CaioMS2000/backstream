import {
	OAuthStateData,
	OAuthStateRepository,
} from '@/modules/auth/application/repositories/oauth-state-repository'
import { DbContext } from '@/shared/transaction/db-context'
import { generateId } from '@/shared/infrastructure/id-generator'
import { oauthState } from '../schemas'
import { eq } from 'drizzle-orm'
import { OauthStateMapper } from '../mappers/oauth-state-mapper'

export class DrizzleOAuthStateRepository extends OAuthStateRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	async save(
		state: string,
		data: OAuthStateData,
		expiresInSeconds: number
	): Promise<void> {
		await this.dbContext
			.current()
			.insert(oauthState)
			.values({
				id: await generateId(),
				codeVerifier: data.codeVerifier,
				provider: data.provider,
				state,
				roles: [data.role],
				expiresInSeconds: expiresInSeconds,
			})
	}

	async findAndDelete(state: string): Promise<OAuthStateData | null> {
		const db = this.dbContext.current()

		const record = await db.query.oauthState.findFirst({
			where: (table, { eq }) => eq(table.state, state),
		})

		if (!record) return null

		await db.delete(oauthState).where(eq(oauthState.state, state))

		return OauthStateMapper.toDomain(record)
	}
}
