import { UniqueId } from '@backstream/core/unique-id'
import { OAuthAccountRecord } from '../application/oauth-account-record'
import { OAuthAccountRepository } from '../application/repositories/oauth-account-repository'

export class InMemoryOAuthAccountRepository extends OAuthAccountRepository {
	public items: OAuthAccountRecord[] = []
	private nextId = 1

	async findByProviderAndAccountId(
		provider: string,
		providerAccountId: string
	): Promise<OAuthAccountRecord | null> {
		return (
			this.items.find(
				item =>
					item.provider === provider &&
					item.providerAccountId === providerAccountId
			) ?? null
		)
	}

	async insert(data: {
		userId: UniqueId
		provider: string
		providerAccountId: string
	}): Promise<{ id: string }> {
		const record: OAuthAccountRecord = {
			id: `oauth-${this.nextId++}`,
			userId: data.userId,
			provider: data.provider,
			providerAccountId: data.providerAccountId,
		}
		this.items.push(record)
		return { id: record.id }
	}
}
