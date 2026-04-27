import { UniqueId } from '@backstream/core/unique-id'
import { UserDrizzleModel } from '../schemas'
import { User } from '@/modules/auth/domain/user'
import { Email, Phone } from '@/shared/domain'
import { InvalidValueError } from '@/@errors/invalid-value-error'

type ToPersistenceParams = User

export class UserMapper {
	static toDomain(record: UserDrizzleModel): User {
		let phone: Phone | null = null

		if (record.phone) {
			const phoneResult = Phone.create(record.phone)

			if (phoneResult.isFailure()) {
				throw new InvalidValueError(phoneResult.value.message)
			}

			phone = phoneResult.value
		}

		const emailResult = Email.create(record.email)

		if (emailResult.isFailure()) {
			throw new InvalidValueError(emailResult.value.message)
		}

		return User.__create({
			id: UniqueId(record.id),
			name: record.name,
			roles: record.roles,
			revokedAt: record.revokedAt,
			createdAt: record.createdAt,
			email: emailResult.value,
			phone,
		})
	}

	static toPersistence(data: ToPersistenceParams): UserDrizzleModel {
		return {
			id: data.id,
			email: data.email.value,
			name: data.name,
			phone: data.phone?.value ?? null,
			roles: data.roles,
			revokedAt: data.revokedAt,
			createdAt: data.createdAt,
		}
	}
}
