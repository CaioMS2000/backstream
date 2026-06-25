import { UniqueId } from '@backstream/core/unique-id'
import { OAuthAccountRecord } from '@/modules/auth/application/oauth-account-record'
import { OauthAccountDrizzleModel } from '../schemas'

export class OauthAccountMapper {
	static toDomain(record: OauthAccountDrizzleModel): OAuthAccountRecord {
		return {
			id: record.id,
			userId: UniqueId(record.userId),
			provider: record.provider,
			providerAccountId: record.providerAccountId,
		}
	}

	static toInsertColumns(data: OAuthAccountRecord) {
		return {
			id: data.id,
			userId: data.userId,
			provider: data.provider,
			providerAccountId: data.providerAccountId,
		}
	}
}
