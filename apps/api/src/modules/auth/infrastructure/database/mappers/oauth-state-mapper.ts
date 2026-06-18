import { UniqueId } from '@backstream/core/unique-id'
import { OAuthStateRecord } from '@/modules/auth/application/oauth-state-record'
import { OauthStateDrizzleModel } from '../schemas'

type ToPersistenceParams = OAuthStateRecord & {
	id: UniqueId
	state: string
	expiresInSeconds: number
	createdAt: Date
}

export class OauthStateMapper {
	static toDomain(record: OauthStateDrizzleModel): OAuthStateRecord {
		return {
			codeVerifier: record.codeVerifier,
			provider: record.provider,
			role: record.roles[0],
		}
	}

	static toPersistence(data: ToPersistenceParams): OauthStateDrizzleModel {
		return {
			id: data.id,
			codeVerifier: data.codeVerifier,
			provider: data.provider,
			state: data.state,
			roles: [data.role],
			expiresInSeconds: data.expiresInSeconds,
			createdAt: data.createdAt,
		}
	}
}
