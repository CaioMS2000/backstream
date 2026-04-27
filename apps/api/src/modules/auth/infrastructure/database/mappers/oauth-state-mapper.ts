import { UniqueId } from '@backstream/core/unique-id'
import { OAuthStateData } from '@/modules/auth/application/repositories/oauth-state-repository'
import { OauthStateDrizzleModel } from '../schemas'

type ToPersistenceParams = OAuthStateData & {
	id: UniqueId
	state: string
	expiresInSeconds: number
	createdAt: Date
}

export class OauthStateMapper {
	static toDomain(record: OauthStateDrizzleModel): OAuthStateData {
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
