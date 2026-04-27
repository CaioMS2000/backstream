import { UniqueId } from '@backstream/core/unique-id'
import { User } from '@/modules/auth/domain/user'
import { UserMapper } from '../mappers/user-mapper'
import { UserRepository } from '@/modules/auth/application/repositories/user-repository'
import { drizzle } from '@/lib/drizzle'
import { user } from '../schemas'
UserMapper
export abstract class DrizzleUserRepository extends UserRepository {
	async save(userData: User): Promise<void> {
		const newRecord = UserMapper.toPersistence(userData)
		await drizzle.insert(user).values(newRecord)
	}

	abstract findById(id: UniqueId): Promise<User | null>
	abstract findByEmail(email: string): Promise<User | null>
	abstract findByPhone(phone: string): Promise<User | null>
}
