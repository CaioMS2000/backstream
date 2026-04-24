import { UniqueId } from '@backstream/core/unique-id'
import { Email } from '@/shared/domain/email'
import { Phone } from '@/shared/domain/phone'
import { generateId } from '@/shared/infrastructure/id-generator'
import { Role } from './role'

export class User {
	private constructor(
		readonly id: UniqueId,
		readonly email: Email,
		readonly name: string,
		readonly phone: Phone | null,
		readonly roles: Role[],
		private _revokedAt: Date | null,
		readonly createdAt: Date
	) {}

	static async create(input: {
		email: Email
		name: string
		phone: Phone | null
		roles: Role[]
		now: Date
	}): Promise<User> {
		return new User(
			await generateId(),
			input.email,
			input.name,
			input.phone,
			input.roles,
			null,
			input.now
		)
	}

	isRevoked(): boolean {
		return this._revokedAt !== null
	}

	revoke(now: Date): void {
		if (this._revokedAt !== null) return
		this._revokedAt = now
	}
}
