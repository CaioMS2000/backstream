import { UniqueId } from '@backstream/core/unique-id'
import { Profile } from '@/modules/profile/domain/profile'
import { Phone } from '@/shared/domain'
import { ProfileDrizzleModel } from '../schemas'

type ToPersistenceParams = Profile

export class ProfileMapper {
	static toDomain(record: ProfileDrizzleModel): Profile {
		const phone = record.phone ? Phone.__create(record.phone) : null

		return Profile.__create({
			id: UniqueId(record.id),
			name: record.name,
			phone,
			avatarUrl: record.avatarUrl,
			userId: UniqueId(record.userId),
			createdAt: record.createdAt,
			updatedAt: record.updatedAt,
		})
	}

	static toPersistence(data: ToPersistenceParams): ProfileDrizzleModel {
		return {
			id: data.id,
			name: data.name,
			phone: data.phone?.value ?? null,
			avatarUrl: data.avatarUrl,
			userId: data.userId,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
		}
	}
}
