import type { UniqueId } from '@backstream/core/unique-id'
import { ProfileRepository } from '../../application/repositories/profile-repository'
import {
	ProfileSummary,
	ProfileSummaryQuery,
} from '../../public/queries/profile-summary-query'

export class ProfileSummaryQueryFromRepo extends ProfileSummaryQuery {
	constructor(private readonly profileRepository: ProfileRepository) {
		super()
	}

	async findByUserId(userId: UniqueId): Promise<ProfileSummary | null> {
		const profile = await this.profileRepository.findByUserId(userId)
		let phone: string | null = null

		if (profile === null) {
			return null
		}

		if (profile.phone) {
			phone = profile.phone.value
		}

		return {
			phone,
			name: profile.name,
		}
	}
}
