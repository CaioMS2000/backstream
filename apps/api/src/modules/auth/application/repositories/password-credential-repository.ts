import { UniqueId } from '@backstream/core/unique-id'
import { PasswordCredential } from '../../domain/password-credential'

export abstract class PasswordCredentialRepository {
	abstract save(credential: PasswordCredential): Promise<void>
	abstract findByUserId(userId: UniqueId): Promise<PasswordCredential | null>
}
