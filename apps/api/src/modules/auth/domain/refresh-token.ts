import { UniqueId } from '@backstream/core/unique-id'
import { generateId } from '@/shared/infrastructure/id-generator'

export class RefreshToken {
	private constructor(
		readonly id: UniqueId,
		readonly userId: UniqueId,
		readonly value: string, // UUID ou random bytes
		readonly expiresAt: Date,
		private _revokedAt: Date | null,
		readonly createdAt: Date
	) {}

	get revokedAt() {
		return this._revokedAt
	}

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

	static __create(props: {
		id: UniqueId
		userId: UniqueId
		value: string
		expiresAt: Date
		revokedAt: Date | null
		createdAt: Date
	}): RefreshToken {
		const { id, userId, value, expiresAt, revokedAt, createdAt } = props
		return new RefreshToken(id, userId, value, expiresAt, revokedAt, createdAt)
	}

	isValid(now: Date): boolean {
		return this._revokedAt === null && this.expiresAt > now
	}

	revoke(now: Date): void {
		if (this._revokedAt !== null) return
		this._revokedAt = now
	}
}
