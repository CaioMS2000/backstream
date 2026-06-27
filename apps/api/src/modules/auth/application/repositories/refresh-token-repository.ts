import { UniqueId } from '@backstream/core/unique-id'
import { RefreshToken } from '../../domain/refresh-token'

export abstract class RefreshTokenRepository {
	abstract insert(token: RefreshToken): Promise<void>
	abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>
	abstract revoke(tokenHash: string, now: Date): Promise<void>
	abstract revokeAllForUser(userId: UniqueId, now: Date): Promise<void>
	abstract markUsed(tokenHash: string, now: Date): Promise<boolean>
}
