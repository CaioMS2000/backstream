import type { UniqueId } from '@backstream/core/unique-id'
import type { UserRepository } from '../../application/repositories/user-repository'
import {
	type UserSummary,
	UserSummaryQuery,
} from '../../contracts/queries/user-summary-query'

export class UserSummaryQueryFromRepo extends UserSummaryQuery {
	constructor(private readonly userRepository: UserRepository) {
		super()
	}

	async findById(userId: UniqueId): Promise<UserSummary | null> {
		const user = await this.userRepository.findById(userId)
		if (!user) return null

		return {
			id: user.id,
			email: user.email.value,
			roles: user.roles,
			isRevoked: user.isRevoked(),
		}
	}
}
