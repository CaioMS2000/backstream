import type { UniqueId } from '@backstream/core/unique-id'
import { OAuthAccountRecord } from '../oauth-account-record'

export abstract class OAuthAccountRepository {
	abstract findByProviderAndAccountId(
		provider: string,
		providerAccountId: string
	): Promise<OAuthAccountRecord | null>

	abstract insert(data: {
		userId: UniqueId
		provider: string
		providerAccountId: string
	}): Promise<{ id: string }>
}
