import { UniqueId } from '@backstream/core/unique-id'
import { generateId } from '@/shared/infrastructure/id-generator'

export class PasswordCredential {
	private constructor(
		readonly id: UniqueId,
		readonly userId: UniqueId,
		private passwordHash: string,
		private _revokedAt: Date | null,
		readonly createdAt: Date
	) {}

	static async create(input: {
		userId: UniqueId
		passwordHash: string
		now: Date
	}): Promise<PasswordCredential> {
		return new PasswordCredential(
			await generateId(),
			input.userId,
			input.passwordHash,
			null,
			input.now
		)
	}

	get hash(): string {
		return this.passwordHash
	}

	isRevoked(): boolean {
		return this._revokedAt !== null
	}

	revoke(now: Date): void {
		if (this._revokedAt !== null) return
		this._revokedAt = now
	}
}
