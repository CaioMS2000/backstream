import { UniqueId } from '@backstream/core/unique-id'
import { Credential } from '../../domain/credential'

export abstract class credentialRepository {
	abstract save(token: Credential): Promise<void>
	abstract findByEmail(email: string): Promise<Credential | null>
	abstract findByUserId(userId: UniqueId): Promise<Credential | null>
}
