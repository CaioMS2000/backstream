import { AggregateRoot } from '@backstream/core/aggregate-root'
import { UniqueId } from '@backstream/core/unique-id'
import { Email } from '@/shared/domain/email'
import { generateId } from '@/shared/infrastructure/id-generator'
import { UserCreated } from './events/user-created'
import { Role } from './role'

export class User extends AggregateRoot {
	private constructor(
		id: UniqueId,
		readonly email: Email,
		private _roles: Role[],
		private _revokedAt: Date | null,
		readonly createdAt: Date
	) {
		super(id)
	}

	get roles(): Role[] {
		return this._roles
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

	static async create(input: {
		email: Email
		roles: Role[]
		now: Date
	}): Promise<User> {
		const user = new User(
			await generateId(),
			input.email,
			input.roles,
			null,
			input.now
		)
		user.addEvent(new UserCreated(user.id, input.email.value, input.now))
		return user
	}

	static __create(input: {
		email: Email
		roles: Role[]
		id: UniqueId
		revokedAt: Date | null
		createdAt: Date
	}): User {
		const user = new User(
			input.id,
			input.email,
			input.roles,
			input.revokedAt,
			input.createdAt
		)

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
