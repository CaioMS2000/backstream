import { generateId } from '@/shared/infrastructure/id-generator'
import { UniqueId } from '@backstream/core/unique-id'

export class RefreshToken {
	private constructor(
		readonly id: UniqueId,
		readonly userId: UniqueId,
		readonly value: string, // UUID ou random bytes
		readonly expiresAt: Date,
		private _revokedAt: Date | null,
		readonly createdAt: Date
	) {}

	static async issue(
		userId: UniqueId,
		value: string,
		now: Date,
		lifetimeMs: number
	): Promise<RefreshToken> {
		return new RefreshToken(
			await generateId(),
			userId,
			value,
			new Date(now.getTime() + lifetimeMs),
			null,
			now
		)
	}

	isValid(now: Date): boolean {
		return this._revokedAt === null && this.expiresAt > now
	}

	revoke(now: Date): void {
		if (this._revokedAt !== null) return
		this._revokedAt = now
	}
}
