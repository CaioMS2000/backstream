import { UniqueId } from '@backstream/core/unique-id'
import { RefreshTokenRepository } from '../application/repositories/refresh-token-repository'
import { RefreshToken } from '../domain/refresh-token'

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
	public items: RefreshToken[] = []

	async insert(token: RefreshToken): Promise<void> {
		this.items.push(token)
	}

	async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
		return this.items.find(t => t.value === tokenHash) ?? null
	}

	async revoke(tokenHash: string, now: Date): Promise<void> {
		const index = this.items.findIndex(t => t.value === tokenHash)
		if (index < 0) return
		this.items[index] = this.apply(this.items[index], { revokedAt: now })
	}

	async revokeAllForUser(userId: UniqueId, now: Date): Promise<void> {
		this.items = this.items.map(token =>
			token.userId === userId ? this.apply(token, { revokedAt: now }) : token
		)
	}

	async markUsed(tokenHash: string, now: Date): Promise<boolean> {
		const index = this.items.findIndex(t => t.value === tokenHash)
		if (index < 0) return false
		if (this.items[index].usedAt !== null) return false
		this.items[index] = this.apply(this.items[index], { usedAt: now })
		return true
	}

	private apply(
		token: RefreshToken,
		patch: { revokedAt?: Date; usedAt?: Date }
	): RefreshToken {
		return RefreshToken.__create({
			id: token.id,
			userId: token.userId,
			value: token.value,
			expiresAt: token.expiresAt,
			revokedAt: patch.revokedAt ?? token.revokedAt,
			usedAt: patch.usedAt ?? token.usedAt,
		})
	}
}
