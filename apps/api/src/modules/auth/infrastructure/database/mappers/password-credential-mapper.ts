import { UniqueId } from '@backstream/core/unique-id'
import { PasswordCredential } from '@/modules/auth/domain/password-credential'
import { PasswordCredentialDrizzleModel } from '../schemas/password-credentials'

export class PasswordCredentialMapper {
	static toDomain(record: PasswordCredentialDrizzleModel): PasswordCredential {
		return PasswordCredential.__create({
			id: UniqueId(record.id),
			userId: UniqueId(record.userId),
			passwordHash: record.passwordHash,
			revokedAt: record.revokedAt,
			createdAt: record.createdAt,
		})
	}

	static toInsertColumns(credential: PasswordCredential) {
		return {
			id: credential.id,
			userId: credential.userId,
			passwordHash: credential.hash,
			revokedAt: credential.revokedAt,
			createdAt: credential.createdAt,
		}
	}
}
