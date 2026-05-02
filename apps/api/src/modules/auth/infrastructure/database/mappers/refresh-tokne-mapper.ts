import { UniqueId } from '@backstream/core/unique-id'
import { RefreshTokenDrizzleModel } from '../schemas'
import { RefreshToken } from '@/modules/auth/domain/refresh-token'

export class RefreshTokenMapper {
	static toDomain(record: RefreshTokenDrizzleModel): RefreshToken {
		return RefreshToken.__create({
			id: UniqueId(record.id),
			userId: UniqueId(record.userId),
			value: record.value,
			expiresAt: record.expiresAt,
			revokedAt: record.revokedAt,
			createdAt: record.createdAt,
		})
	}

	static toPersistence(data: RefreshToken) {
		return {
			id: data.id,
			userId: data.userId,
			value: data.value,
			expiresAt: data.expiresAt,
			revokedAt: data.revokedAt,
			createdAt: data.createdAt,
		}
	}
}
