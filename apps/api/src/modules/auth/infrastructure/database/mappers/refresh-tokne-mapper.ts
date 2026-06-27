import { UniqueId } from '@backstream/core/unique-id'
import { RefreshToken } from '@/modules/auth/domain/refresh-token'
import { RefreshTokenDrizzleModel } from '../schemas'

export class RefreshTokenMapper {
	static toDomain(record: RefreshTokenDrizzleModel): RefreshToken {
		return RefreshToken.__create({
			id: UniqueId(record.id),
			userId: UniqueId(record.userId),
			value: record.value,
			expiresAt: record.expiresAt,
			revokedAt: record.revokedAt,
			usedAt: record.usedAt,
		})
	}

	static toInsertColumns(token: RefreshToken) {
		return {
			id: token.id,
			userId: token.userId,
			value: token.value,
			expiresAt: token.expiresAt,
			revokedAt: token.revokedAt,
		}
	}
}
