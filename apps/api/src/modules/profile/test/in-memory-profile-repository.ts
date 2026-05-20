import { UniqueId } from '@backstream/core'
import { ProfileRepository } from '../application/repositories/profile-repository'
import { Profile } from '../domain/profile'

export class InMemoryProfileRepository extends ProfileRepository {
	public profiles: Profile[] = []

	async save(profile: Profile): Promise<void> {
		const index = this.profiles.findIndex(p => p.id === profile.id)
		if (index !== -1) {
			this.profiles[index] = profile
		} else {
			this.profiles.push(profile)
		}
	}

	async findByUserId(userId: UniqueId): Promise<Profile | null> {
		return this.profiles.find(p => p.userId === userId) ?? null
	}

	async findByPhone(phone: string): Promise<Profile | null> {
		return (
			this.profiles.find(p => {
				if (p.phone === null) return false

				return p.phone.value === phone
			}) ?? null
		)
	}
}
