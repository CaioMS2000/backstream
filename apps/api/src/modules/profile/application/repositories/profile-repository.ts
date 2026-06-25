import { UniqueId } from '@backstream/core'
import { Phone, Username } from '@/shared/domain'
import { Profile } from '../../domain/profile'

export abstract class ProfileRepository {
	abstract insert(profile: Profile): Promise<void>
	abstract update(profile: Profile): Promise<void>
	abstract findByUserId(userId: UniqueId): Promise<Profile | null>
	abstract findByPhone(phone: Phone): Promise<Profile | null>
	abstract findByUsername(username: Username): Promise<Profile | null>
}
