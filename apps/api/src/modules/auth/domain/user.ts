import { AggregateRoot } from '@backstream/core/aggregate-root'
import { UniqueId } from '@backstream/core/unique-id'
import { Email } from '@/shared/domain/email'
import { Phone } from '@/shared/domain/phone'
import { generateId } from '@/shared/infrastructure/id-generator'
import { UserCreated } from './events/user-created'
import { Role } from './role'

export class User extends AggregateRoot {
	private constructor(
		id: UniqueId,
		readonly email: Email,
		readonly name: string,
		readonly phone: Phone | null,
		readonly roles: Role[],
		private _revokedAt: Date | null,
		readonly createdAt: Date
	) {
		super(id)
	}

	static async create(input: {
		email: Email
		name: string
		phone: Phone | null
		roles: Role[]
		now: Date
	}): Promise<User> {
		const user = new User(
			await generateId(),
			input.email,
			input.name,
			input.phone,
			input.roles,
			null,
			input.now
		)
		user.addEvent(new UserCreated(user.id, input.email.value, input.now))
		return user
	}

	isRevoked(): boolean {
		return this._revokedAt !== null
	}

	revoke(now: Date): void {
		if (this._revokedAt !== null) return
		this._revokedAt = now
	}
}
