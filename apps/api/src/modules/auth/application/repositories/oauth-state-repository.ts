import { OAuthStateRecord } from '../oauth-state-record'

export abstract class OAuthStateRepository {
	abstract insert(
		state: string,
		data: OAuthStateRecord,
		expiresInSeconds: number
	): Promise<void>

	abstract findAndDelete(state: string): Promise<OAuthStateRecord | null>
}
