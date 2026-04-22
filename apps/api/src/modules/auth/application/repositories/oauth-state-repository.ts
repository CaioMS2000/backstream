import { Role } from '../../domain/role'

export type OAuthStateData = {
	codeVerifier: string
	provider: string
	role: Role
}

export abstract class OAuthStateRepository {
	abstract save(
		state: string,
		data: OAuthStateData,
		expiresInSeconds: number
	): Promise<void>

	abstract findAndDelete(state: string): Promise<OAuthStateData | null>
}
