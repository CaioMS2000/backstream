import { UniqueId } from '@backstream/core/unique-id'
import { RefreshToken } from '../../domain/refresh-token'

export abstract class RefreshTokenRepository {
	abstract save(token: RefreshToken): Promise<void>
	abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>
	abstract revoke(tokenHash: string): Promise<void>
	abstract revokeAllForUser(userId: UniqueId): Promise<void>
	abstract markUsed(tokenHash: string): Promise<boolean>
}
