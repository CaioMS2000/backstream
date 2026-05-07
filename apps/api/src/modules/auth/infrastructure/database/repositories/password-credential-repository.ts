import { UniqueId } from '@backstream/core/unique-id'
import { drizzle } from '@/lib/drizzle'
import { PasswordCredentialRepository } from '@/modules/auth/application/repositories/password-credential-repository'
import { PasswordCredential } from '@/modules/auth/domain/password-credential'
import { PasswordCredentialMapper } from '../mappers/password-credential-mapper'
import { passwordCredential } from '../schemas'

export class DrizzlePasswordCredentialRepository extends PasswordCredentialRepository {
	async save(credential: PasswordCredential): Promise<void> {
		await drizzle.insert(passwordCredential).values({
			id: credential.id,
			userId: credential.userId,
			passwordHash: credential.hash,
			revokedAt: credential.revokedAt,
			createdAt: credential.createdAt,
		})
	}

	async findByUserId(userId: UniqueId): Promise<PasswordCredential | null> {
		const record = await drizzle.query.passwordCredential.findFirst({
			where: (table, { eq }) => eq(table.userId, userId),
		})

		if (!record) return null

		return PasswordCredentialMapper.toDomain(record)
	}
}
