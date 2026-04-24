import { UniqueId } from '@backstream/core/unique-id'
import { RefreshTokenRepository } from '../application/repositories/refresh-token-repository'
import { RefreshToken } from '../domain/refresh-token'
import { now } from '@/shared/infrastructure/clock'

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
	public items: RefreshToken[] = []
	private usedHashes = new Set<string>()

	async save(token: RefreshToken): Promise<void> {
		this.items.push(token)
	}

	async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
		return this.items.find(t => t.value === tokenHash) ?? null
	}

	async revoke(tokenHash: string): Promise<void> {
		const token = this.items.find(t => t.value === tokenHash)
		token?.revoke(now())
	}

	async revokeAllForUser(userId: UniqueId): Promise<void> {
		for (const token of this.items) {
			if (token.userId === userId) {
				token.revoke(now())
			}
		}
	}

	async markUsed(tokenHash: string): Promise<boolean> {
		if (this.usedHashes.has(tokenHash)) {
			return false
		}
		this.usedHashes.add(tokenHash)
		return true
	}
}
