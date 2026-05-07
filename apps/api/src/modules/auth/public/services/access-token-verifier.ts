import type { AuthenticatedUser } from '../types/authenticated-user'

export abstract class AccessTokenVerifier {
	abstract verify(token: string): Promise<AuthenticatedUser | null>
}
