import { UniqueId } from '@backstream/core'
import { Phone, Username } from '@/shared/domain'
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

	async findByPhone(phone: Phone): Promise<Profile | null> {
		return this.profiles.find(p => p.phone?.equals(phone) ?? false) ?? null
	}

	async findByUsername(username: Username): Promise<Profile | null> {
		return this.profiles.find(p => p.username.equals(username)) ?? null
	}
}
