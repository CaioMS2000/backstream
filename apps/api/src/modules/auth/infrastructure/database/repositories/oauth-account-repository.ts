import { UniqueId } from '@backstream/core/unique-id'
import type { DrizzleClient } from '@/lib/drizzle'
import {
	OAuthAccountRecord,
	OAuthAccountRepository,
} from '@/modules/auth/application/repositories/oauth-account-repository'
import { generateId } from '@/shared/infrastructure/id-generator'
import { oauthAccount } from '../schemas'
import { OauthAccountMapper } from '../mappers/oauth-account-mapper'

export class DrizzleOAuthAccountRepository extends OAuthAccountRepository {
	constructor(private db: DrizzleClient) {
		super()
	}

	async findByProviderAndAccountId(
		provider: string,
		providerAccountId: string
	): Promise<OAuthAccountRecord | null> {
		const record = await this.db.query.oauthAccount.findFirst({
			where: (table, { eq, and }) =>
				and(
					eq(table.provider, provider),
					eq(table.providerAccountId, providerAccountId)
				),
		})

		if (!record) return null

		return OauthAccountMapper.toDomain(record)
	}

	async save(data: {
		userId: UniqueId
		provider: string
		providerAccountId: string
	}): Promise<{ id: string }> {
		const [record] = await this.db
			.insert(oauthAccount)
			.values({
				userId: data.userId,
				provider: data.provider,
				providerAccountId: data.providerAccountId,
				id: await generateId(),
			})
			.returning()
		return { id: record.id }
	}
}
