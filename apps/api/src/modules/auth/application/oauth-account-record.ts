import type { UniqueId } from '@backstream/core/unique-id'

export type OAuthAccountRecord = {
	id: string
	userId: UniqueId
	provider: string
	providerAccountId: string
}
