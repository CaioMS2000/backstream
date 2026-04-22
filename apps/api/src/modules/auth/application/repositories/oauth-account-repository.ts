import type { UniqueId } from '@backstream/core/unique-id'

export type OAuthAccountRecord = {
	id: string
	userId: UniqueId
	provider: string
	providerAccountId: string
}

export abstract class OAuthAccountRepository {
	abstract findByProviderAndAccountId(
		provider: string,
		providerAccountId: string
	): Promise<OAuthAccountRecord | null>

	abstract save(data: {
		userId: UniqueId
		provider: string
		providerAccountId: string
	}): Promise<{ id: string }>
}
