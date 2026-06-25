import { UniqueId } from '@backstream/core/unique-id'
import { OAuthAccountRecord } from '@/modules/auth/application/oauth-account-record'
import { OAuthAccountRepository } from '@/modules/auth/application/repositories/oauth-account-repository'
import { generateId } from '@/shared/infrastructure/id-generator'
import { DbContext } from '@/shared/transaction/db-context'
import { OauthAccountMapper } from '../mappers/oauth-account-mapper'
import { oauthAccount } from '../schemas'

export class DrizzleOAuthAccountRepository extends OAuthAccountRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	async findByProviderAndAccountId(
		provider: string,
		providerAccountId: string
	): Promise<OAuthAccountRecord | null> {
		const record = await this.dbContext.current().query.oauthAccount.findFirst({
			where: (table, { eq, and }) =>
				and(
					eq(table.provider, provider),
					eq(table.providerAccountId, providerAccountId)
				),
		})

		if (!record) return null

		return OauthAccountMapper.toDomain(record)
	}

	async insert(data: {
		userId: UniqueId
		provider: string
		providerAccountId: string
	}): Promise<{ id: string }> {
		const [record] = await this.dbContext
			.current()
			.insert(oauthAccount)
			.values(
				OauthAccountMapper.toInsertColumns({
					userId: data.userId,
					provider: data.provider,
					providerAccountId: data.providerAccountId,
					id: await generateId(),
				})
			)
			.returning()

		return { id: record.id }
	}
}
