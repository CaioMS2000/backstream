import { UniqueId } from '@backstream/core/unique-id'
import { PasswordCredentialRepository } from '../application/repositories/password-credential-repository'
import { PasswordCredential } from '../domain/password-credential'

export class InMemoryPasswordCredentialRepository extends PasswordCredentialRepository {
	public items: PasswordCredential[] = []

	async insert(credential: PasswordCredential): Promise<void> {
		const index = this.items.findIndex(c => c.userId === credential.userId)
		if (index >= 0) {
			this.items[index] = credential
		} else {
			this.items.push(credential)
		}
	}

	async findByUserId(userId: UniqueId): Promise<PasswordCredential | null> {
		return this.items.find(c => c.userId === userId) ?? null
	}
}
