import { UniqueId } from '@backstream/core/unique-id'
import { Profile } from '@/modules/profile/domain/profile'
import { Phone, Username } from '@/shared/domain'
import { ProfileDrizzleModel } from '../schemas'

export class ProfileMapper {
	static toDomain(record: ProfileDrizzleModel): Profile {
		const phone = record.phone ? Phone.__create(record.phone) : null

		return Profile.__create({
			id: UniqueId(record.id),
			name: record.name,
			username: Username.__create(record.username),
			phone,
			avatarUrl: record.avatarUrl,
			userId: UniqueId(record.userId),
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		})
	}

	static toInsertColumns(user: Profile): ProfileDrizzleModel {
		return {
			id: user.id,
			name: user.name,
			username: user.username.value,
			phone: user.phone?.value ?? null,
			avatarUrl: user.avatarUrl,
			userId: user.userId,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		}
	}

	static toUpdateColumns(user: Profile) {
		return {
			name: user.name,
			username: user.username.value,
			phone: user.phone?.value ?? null,
			avatarUrl: user.avatarUrl,
			updatedAt: user.updatedAt,
		}
	}
}
