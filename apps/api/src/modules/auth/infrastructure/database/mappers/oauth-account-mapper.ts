import { UniqueId } from '@backstream/core/unique-id'
import { OauthAccountDrizzleModel } from '../schemas'
import { OAuthAccountRecord } from '@/modules/auth/application/repositories/oauth-account-repository'

type ToPersistenceParams = OAuthAccountRecord & { createdAt: Date }

export class OauthAccountMapper {
	static toDomain(record: OauthAccountDrizzleModel): OAuthAccountRecord {
		return {
			id: record.id,
			userId: UniqueId(record.userId),
			provider: record.provider,
			providerAccountId: record.providerAccountId,
		}
	}

	static toPersistence(data: ToPersistenceParams): OauthAccountDrizzleModel {
		return {
			id: data.id,
			userId: data.userId,
			provider: data.provider,
			providerAccountId: data.providerAccountId,
			createdAt: data.createdAt,
		}
	}
}
