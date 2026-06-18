import { UniqueId } from '@backstream/core/unique-id'
import { eq } from 'drizzle-orm'
import { UserNotFoundError } from '@/modules/auth/application/@errors'
import { UserRepository } from '@/modules/auth/application/repositories/user-repository'
import { User } from '@/modules/auth/domain/user'
import { DbContext } from '@/shared/transaction/db-context'
import { UserMapper } from '../mappers/user-mapper'
import { user } from '../schemas'

export class DrizzleUserRepository extends UserRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	get drizzle() {
		return this.dbContext.current()
	}

	async insert(userData: User): Promise<void> {
		const newRecord = UserMapper.toPersistence(userData)
		await this.drizzle.insert(user).values(newRecord)
	}

	async update(userData: User): Promise<void> {
		const updated = await this.drizzle
			.update(user)
			.set({
				email: userData.email.value,
				roles: userData.roles,
				revokedAt: userData.revokedAt,
			})
			.where(eq(user.id, userData.id))
			.returning()

		if (updated.length === 0) {
			throw new UserNotFoundError()
		}
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
