import { UniqueId } from '@backstream/core'
import { eq } from 'drizzle-orm'
import { ProfileNotFoundError } from '@/modules/profile/application/@errors/profile-not-found-error'
import { ProfileRepository } from '@/modules/profile/application/repositories/profile-repository'
import { Profile } from '@/modules/profile/domain/profile'
import { DbContext } from '@/shared/transaction/db-context'
import { ProfileMapper } from '../mappers/profile-mapper'
import { profile as profileSchema } from '../schemas'

export class DrizzleProfileRepository extends ProfileRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	async insert(profile: Profile): Promise<void> {
		const record = ProfileMapper.toInsertColumns(profile)

		await this.dbContext.current().insert(profileSchema).values(record)
	}

	async update(profile: Profile): Promise<void> {
		const updated = await this.dbContext
			.current()
			.update(profileSchema)
			.set(ProfileMapper.toUpdateColumns(profile))
			.where(eq(profileSchema.id, profile.id))
			.returning()

		if (updated.length === 0) {
			throw new ProfileNotFoundError()
		}
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

	async findByUsername(username: string): Promise<Profile | null> {
		const record = await this.dbContext.current().query.profile.findFirst({
			where: (profile, { eq }) => eq(profile.username, username),
		})

		if (!record) return null

		return ProfileMapper.toDomain(record)
	}
}
