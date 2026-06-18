import { UniqueId } from '@backstream/core'
import { ProfileNotFoundError } from '../application/@errors/profile-not-found-error'
import { ProfileRepository } from '../application/repositories/profile-repository'
import { Profile } from '../domain/profile'

export class InMemoryProfileRepository extends ProfileRepository {
	public profiles: Profile[] = []

	async insert(profile: Profile): Promise<void> {
		this.profiles.push(profile)
	}

	async update(profile: Profile): Promise<void> {
		const index = this.profiles.findIndex(p => p.id === profile.id)
		if (index === -1) throw new ProfileNotFoundError()
		this.profiles[index] = profile
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

	async findByUsername(username: string): Promise<Profile | null> {
		return this.profiles.find(p => p.username.value === username) ?? null
	}
}
