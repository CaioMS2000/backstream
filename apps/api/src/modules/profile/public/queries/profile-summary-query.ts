import type { UniqueId } from '@backstream/core/unique-id'

export type ProfileSummary = {
	name: string
	phone: string | null
}

export abstract class ProfileSummaryQuery {
	abstract findByUserId(userId: UniqueId): Promise<ProfileSummary | null>
}
