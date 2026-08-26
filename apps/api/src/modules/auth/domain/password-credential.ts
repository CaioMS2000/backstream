import { UniqueId } from '@backstream/core/unique-id'

export class PasswordCredential {
	private constructor(
		readonly id: UniqueId,
		readonly userId: UniqueId,
		private passwordHash: string,
		private _revokedAt: Date | null
	) {}

	static create(input: {
		id: UniqueId
		userId: UniqueId
		passwordHash: string
	}): PasswordCredential {
		return new PasswordCredential(
			input.id,
			input.userId,
			input.passwordHash,
			null
		)
	}

	static __create(input: {
		id: UniqueId
		revokedAt: Date | null
		userId: UniqueId
		passwordHash: string
	}): PasswordCredential {
		return new PasswordCredential(
			input.id,
			input.userId,
			input.passwordHash,
			input.revokedAt
		)
	}

	get hash(): string {
		return this.passwordHash
	}

	get revokedAt(): Date | null {
		return this._revokedAt
	}

	isRevoked(): boolean {
		return this._revokedAt !== null
	}

	revoke(now: Date): void {
		if (this._revokedAt !== null) return
		this._revokedAt = now
	}
}
