import { UniqueId } from '@backstream/core/unique-id'
import { drizzle } from '@/lib/drizzle'
import { UserRepository } from '@/modules/auth/application/repositories/user-repository'
import { User } from '@/modules/auth/domain/user'
import { UserMapper } from '../mappers/user-mapper'
import { user } from '../schemas'

export class DrizzleUserRepository extends UserRepository {
	async save(userData: User): Promise<void> {
		const newRecord = UserMapper.toPersistence(userData)
		await drizzle.insert(user).values(newRecord)
	}

	async findById(id: UniqueId): Promise<User | null> {
		const record = await drizzle.query.user.findFirst({
			where: (table, { eq }) => eq(table.id, id),
		})

		if (!record) return null

		return UserMapper.toDomain(record)
	}

	async findByEmail(email: string): Promise<User | null> {
		const record = await drizzle.query.user.findFirst({
			where: (table, { eq }) => eq(table.email, email),
		})

		if (!record) return null

		return UserMapper.toDomain(record)
	}

	async findByPhone(phone: string): Promise<User | null> {
		const record = await drizzle.query.user.findFirst({
			where: (table, { eq }) => eq(table.phone, phone),
		})

		if (!record) return null

		return UserMapper.toDomain(record)
	}
}
