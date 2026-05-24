import { UniqueId } from '@backstream/core/unique-id'
import { UserDrizzleModel } from '../schemas'
import { User } from '@/modules/auth/domain/user'
import { Email } from '@/shared/domain'
import { InvalidValueError } from '@/@errors/invalid-value-error'

type ToPersistenceParams = User

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

	static toPersistence(data: ToPersistenceParams): UserDrizzleModel {
		return {
			id: data.id,
			email: data.email.value,
			roles: data.roles,
			revokedAt: data.revokedAt,
			createdAt: data.createdAt,
		}
	}
}
