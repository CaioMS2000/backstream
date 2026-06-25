import { UniqueId } from '@backstream/core/unique-id'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { User } from '@/modules/auth/domain/user'
import { Email } from '@/shared/domain'
import { UserDrizzleModel } from '../schemas'

export class UserMapper {
	static toDomain(record: UserDrizzleModel): User {
		const emailResult = Email.create(record.email)

		if (emailResult.isFailure()) {
			throw new InvalidValueError(emailResult.value.message)
		}

		return User.__create({
			id: UniqueId(record.id),
			roles: record.roles,
			revokedAt: record.revokedAt,
			createdAt: record.createdAt,
			email: emailResult.value,
		})
	}

	static toInsertColumns(user: User): UserDrizzleModel {
		return {
			id: user.id,
			email: user.email.value,
			roles: user.roles,
			revokedAt: user.revokedAt,
			createdAt: user.createdAt,
		}
	}

	static toUpdateColumns(user: User) {
		return {
			email: user.email.value,
			roles: user.roles,
			revokedAt: user.revokedAt,
		}
	}
}
