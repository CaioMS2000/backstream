import { UniqueId } from '@backstream/core/unique-id'
import { User } from '../../domain/user'

export abstract class UserRepository {
	abstract save(user: User): Promise<void>
	abstract findById(id: UniqueId): Promise<User | null>
	abstract findByEmail(email: string): Promise<User | null>
	abstract findByPhone(phone: string): Promise<User | null>
}
