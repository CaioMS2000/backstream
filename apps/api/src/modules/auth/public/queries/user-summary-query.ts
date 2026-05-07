import type { UniqueId } from '@backstream/core/unique-id'
import type { Role } from '../../domain/role'

export type UserSummary = {
	id: UniqueId
	email: string
	roles: Role[]
	isRevoked: boolean
}

export abstract class UserSummaryQuery {
	abstract findById(userId: UniqueId): Promise<UserSummary | null>
}
