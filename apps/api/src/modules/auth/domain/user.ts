import { AggregateRoot } from '@backstream/core/aggregate-root'
import { UniqueId } from '@backstream/core/unique-id'
import { Email } from '@/shared/domain/email'
import { UserCreated } from './events/user-created'
import { Role } from './role'

type CreateParams = {
	id: UniqueId
	email: Email
	roles: Role[]
	now: Date
}

export class User extends AggregateRoot {
	private constructor(
		id: UniqueId,
		private _email: Email,
		private _roles: Role[],
		private _revokedAt: Date | null
	) {
		super(id)
	}

	get roles(): Role[] {
		return this._roles
	}

	get email() {
		return this._email
	}

	get revokedAt(): Date | null {
		return this._revokedAt
	}

	hasRole(role: Role): boolean {
		return this._roles.includes(role)
	}

	addRole(role: Role): void {
		if (this._roles.includes(role)) return
		this._roles.push(role)
	}

	removeRole(role: Role): void {
		this._roles = this._roles.filter(r => r !== role)
	}

	static create(input: CreateParams): User {
		const user = new User(input.id, input.email, input.roles, null)
		user.addEvent(new UserCreated(user.id, input.email.value, input.now))
		return user
	}

	static __create(input: {
		email: Email
		roles: Role[]
		id: UniqueId
		revokedAt: Date | null
	}): User {
		const user = new User(input.id, input.email, input.roles, input.revokedAt)

		return user
	}

	isRevoked(): boolean {
		return this._revokedAt !== null
	}

	revoke(now: Date): void {
		if (this._revokedAt !== null) return
		this._revokedAt = now
	}

	changeEmail(newEmail: Email): void {
		this._email = newEmail
	}
}
