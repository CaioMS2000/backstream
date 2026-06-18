import { UniqueId } from '@backstream/core'
import { Profile } from '../../domain/profile'

export abstract class ProfileRepository {
	abstract insert(profile: Profile): Promise<void>
	abstract update(profile: Profile): Promise<void>
	abstract findByUserId(userId: UniqueId): Promise<Profile | null>
	abstract findByPhone(phone: string): Promise<Profile | null>
	abstract findByUsername(username: string): Promise<Profile | null>
}
