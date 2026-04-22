import { UniqueId } from '@backstream/core/unique-id'
import { Email } from '@/shared/domain'
import { generateId } from '@/shared/infrastructure/id-generator'
import { Role } from './role'

export class Credential {
	private constructor(
		readonly id: UniqueId,
		readonly userId: UniqueId,
		readonly email: Email,
		private passwordHash: string,
		readonly roles: Role[],
		private _revokedAt: Date | null,
		readonly createdAt: Date
	) {}

	static async create(input: {
		userId: UniqueId
		email: Email
		passwordHash: string
		roles: Role[]
		now: Date
	}): Promise<Credential> {
		return new Credential(
			await generateId(),
			input.userId,
			input.email,
			input.passwordHash,
			input.roles,
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
