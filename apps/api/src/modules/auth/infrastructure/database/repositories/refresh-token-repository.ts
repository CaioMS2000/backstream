import { UniqueId } from '@backstream/core/unique-id'
import { and, eq, isNull } from 'drizzle-orm'
import { RefreshTokenRepository } from '@/modules/auth/application/repositories/refresh-token-repository'
import { RefreshToken } from '@/modules/auth/domain/refresh-token'
import { DbContext } from '@/shared/transaction/db-context'
import { RefreshTokenMapper } from '../mappers/refresh-tokne-mapper'
import { refreshToken } from '../schemas'

export class DrizzleRefreshTokenRepository extends RefreshTokenRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	async insert(token: RefreshToken): Promise<void> {
		const newRecord = RefreshTokenMapper.toPersistence(token)
		await this.dbContext.current().insert(refreshToken).values(newRecord)
	}

	async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
		const record = await this.dbContext.current().query.refreshToken.findFirst({
			where: (table, { eq }) => eq(table.value, tokenHash),
		})

		if (!record) return null

		return RefreshTokenMapper.toDomain(record)
	}

	async revoke(tokenHash: string): Promise<void> {
		const _result = await this.dbContext
			.current()
			.update(refreshToken)
			.set({ revokedAt: new Date() })
			.where(
				and(eq(refreshToken.value, tokenHash), isNull(refreshToken.revokedAt))
			)
		// _return (result.rowCount ?? 0) > 0 // indicates if a token was actually revoked
	}

	async revokeAllForUser(userId: UniqueId): Promise<void> {
		await this.dbContext
			.current()
			.update(refreshToken)
			.set({ revokedAt: new Date() })
			.where(
				and(eq(refreshToken.userId, userId), isNull(refreshToken.revokedAt))
			)
	}

	async markUsed(tokenHash: string): Promise<boolean> {
		const result = await this.dbContext
			.current()
			.update(refreshToken)
			.set({ usedAt: new Date() })
			.where(
				and(eq(refreshToken.value, tokenHash), isNull(refreshToken.usedAt))
			)
		return (result.rowCount ?? 0) > 0
	}
}
