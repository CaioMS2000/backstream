import { Role } from '../domain/role'

export type OAuthStateRecord = {
	codeVerifier: string
	provider: string
	role: Role
}
