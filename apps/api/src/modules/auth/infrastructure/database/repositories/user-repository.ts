import { UniqueId } from '@backstream/core/unique-id'
import { UserRepository } from '@/modules/auth/application/repositories/user-repository'
import { User } from '@/modules/auth/domain/user'
import { DbContext } from '@/shared/transaction/db-context'
import { UserMapper } from '../mappers/user-mapper'
import { user } from '../schemas'

export class DrizzleUserRepository extends UserRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	async save(userData: User): Promise<void> {
		const newRecord = UserMapper.toPersistence(userData)
		await this.dbContext
			.current()
			.insert(user)
			.values(newRecord)
			.onConflictDoUpdate({
				target: user.id,
				set: {
					roles: newRecord.roles,
					revokedAt: newRecord.revokedAt,
				},
			})
	}

	async findById(id: UniqueId): Promise<User | null> {
		const record = await this.dbContext.current().query.user.findFirst({
			where: (table, { eq }) => eq(table.id, id),
		})

		if (!record) return null

		return UserMapper.toDomain(record)
	}

	async findByEmail(email: string): Promise<User | null> {
		const record = await this.dbContext.current().query.user.findFirst({
			where: (table, { eq }) => eq(table.email, email),
		})

		if (!record) return null

		return UserMapper.toDomain(record)
	}
}
