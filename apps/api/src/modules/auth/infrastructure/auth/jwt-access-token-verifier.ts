import type { JwtService } from '@/modules/auth/application/jwt'
import type { Role } from '@/modules/auth/domain/role'
import { AccessTokenVerifier } from '@/modules/auth/public/services/access-token-verifier'
import type { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'

export class JwtAccessTokenVerifier extends AccessTokenVerifier {
	constructor(private readonly jwtService: JwtService) {
		super()
	}

	async verify(token: string): Promise<AuthenticatedUser | null> {
		const payload = await this.jwtService.verifyAccessToken(token)
		if (!payload) return null
		if (typeof payload.sub !== 'string') return null
		if (typeof payload.email !== 'string') return null
		if (!Array.isArray(payload.roles)) return null
		return {
			userId: payload.sub,
			email: payload.email,
			roles: payload.roles as Role[],
		}
	}
}
