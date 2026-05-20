import { UniqueId } from '@backstream/core'
import { Profile } from '../../domain/profile'

export abstract class ProfileRepository {
	abstract save(profile: Profile): Promise<void>
	abstract findByUserId(userId: UniqueId): Promise<Profile | null>
	abstract findByPhone(phone: string): Promise<Profile | null>
}
