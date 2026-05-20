import { UniqueId } from '@backstream/core/unique-id'
import { ProfileDrizzleModel } from '../schemas'
import { Phone } from '@/shared/domain'
import { Profile } from '@/modules/profile/domain/profile'

type ToPersistenceParams = Profile

export class ProfileMapper {
	static toDomain(record: ProfileDrizzleModel): Profile {
		const phone = record.phone ? Phone.__create(record.phone) : null

		return Profile.__create({
			id: UniqueId(record.id),
			name: record.name,
			phone,
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
			userId: data.userId,
			createdAt: data.createdAt,
			updatedAt: data.updatedAt,
		}
	}
}
