import { UniqueId } from '@backstream/core/unique-id'
import { PasswordCredentialRepository } from '@/modules/auth/application/repositories/password-credential-repository'
import { PasswordCredential } from '@/modules/auth/domain/password-credential'
import { DbContext } from '@/shared/transaction/db-context'
import { PasswordCredentialMapper } from '../mappers/password-credential-mapper'
import { passwordCredential } from '../schemas'

export class DrizzlePasswordCredentialRepository extends PasswordCredentialRepository {
	constructor(private dbContext: DbContext) {
		super()
	}

	async insert(credential: PasswordCredential): Promise<void> {
		await this.dbContext
			.current()
			.insert(passwordCredential)
			.values(PasswordCredentialMapper.toInsertColumns(credential))
	}

	async findByUserId(userId: UniqueId): Promise<PasswordCredential | null> {
		const record = await this.dbContext
			.current()
			.query.passwordCredential.findFirst({
				where: (table, { eq }) => eq(table.userId, userId),
			})

		if (!record) return null

		return PasswordCredentialMapper.toDomain(record)
	}
}
