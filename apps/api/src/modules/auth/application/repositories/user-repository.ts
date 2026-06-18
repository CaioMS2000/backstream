import { UniqueId } from '@backstream/core/unique-id'
import { User } from '../../domain/user'

export abstract class UserRepository {
	abstract insert(user: User): Promise<void>
	abstract update(user: User): Promise<void>
	abstract findById(id: UniqueId): Promise<User | null>
	abstract findByEmail(email: string): Promise<User | null>
}
