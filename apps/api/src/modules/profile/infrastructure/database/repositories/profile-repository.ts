import { UniqueId } from '@backstream/core'
import { ProfileRepository } from '@/modules/profile/application/repositories/profile-repository'
import { Profile } from '@/modules/profile/domain/profile'
import { DbContext } from '@/shared/transaction/db-context'
import { ProfileMapper } from '../mappers/profile-mapper'
import { profile as profileSchema } from '../schemas'

export class DrizzleProfileRepository extends ProfileRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	async save(profile: Profile): Promise<void> {
		const record = ProfileMapper.toPersistence(profile)

		await this.dbContext
			.current()
			.insert(profileSchema)
			.values(record)
			.onConflictDoUpdate({
				target: profileSchema.userId,
				set: {
					name: record.name,
					phone: record.phone,
					updatedAt: record.updatedAt,
				},
			})
	}

	async findByUserId(userId: UniqueId): Promise<Profile | null> {
		const record = await this.dbContext.current().query.profile.findFirst({
			where: (profile, { eq }) => eq(profile.userId, userId),
		})

		if (!record) return null

		return ProfileMapper.toDomain(record)
	}

	async findByPhone(phone: string): Promise<Profile | null> {
		const record = await this.dbContext.current().query.profile.findFirst({
			where: (profile, { eq }) => eq(profile.phone, phone),
		})

		if (!record) return null

		return ProfileMapper.toDomain(record)
	}
}
