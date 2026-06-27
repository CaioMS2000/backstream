import { UniqueId } from '@backstream/core/unique-id'

export class RefreshToken {
	private constructor(
		readonly id: UniqueId,
		readonly userId: UniqueId,
		readonly value: string, // UUID ou random bytes
		readonly expiresAt: Date,
		private readonly _revokedAt: Date | null,
		private readonly _usedAt: Date | null
	) {}

	get revokedAt(): Date | null {
		return this._revokedAt
	}

	get usedAt(): Date | null {
		return this._usedAt
	}

	static issue(input: {
		id: UniqueId
		userId: UniqueId
		value: string
		now: Date
		lifetimeMs: number
	}): RefreshToken {
		return new RefreshToken(
			input.id,
			input.userId,
			input.value,
			new Date(input.now.getTime() + input.lifetimeMs),
			null,
			null
		)
	}

	static __create(props: {
		id: UniqueId
		userId: UniqueId
		value: string
		expiresAt: Date
		revokedAt: Date | null
		usedAt: Date | null
	}): RefreshToken {
		return new RefreshToken(
			props.id,
			props.userId,
			props.value,
			props.expiresAt,
			props.revokedAt,
			props.usedAt
		)
	}

	isValid(now: Date): boolean {
		return (
			this._revokedAt === null && this._usedAt === null && this.expiresAt > now
		)
	}
}
