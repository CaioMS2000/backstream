import {
	DomainEventDispatcher,
	failure,
	Result,
	success,
	UniqueId,
} from '@backstream/core'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Phone } from '@/shared/domain'
import { now } from '@/shared/infrastructure/clock'
import { Profile } from '../../domain/profile'
import { PhoneAlreadyRegisteredError } from '../@errors'
import { ProfileNotFoundError } from '../@errors/profile-not-found-error'
import { ProfileRepository } from '../repositories/profile-repository'

export type UpdateProfileUseCaseRequest = {
	name: string
	phone: string | null
	userId: string
}

export type UpdateProfileUseCaseResponse = Result<
	PhoneAlreadyRegisteredError | ProfileNotFoundError | InvalidValueError,
	{ profile: Profile }
>

type UseCaseProps = {
	profileRepository: ProfileRepository
	domainEvents: DomainEventDispatcher
}

export class UpdateProfileUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: UpdateProfileUseCaseRequest
	): Promise<UpdateProfileUseCaseResponse> {
		const existingProfile = await this.props.profileRepository.findByUserId(
			UniqueId(input.userId)
		)

		if (!existingProfile) return failure(ProfileNotFoundError)

		const phoneResult = Phone.createOptional(input.phone)

		if (phoneResult.isFailure()) return failure(phoneResult.value)

		const phone = phoneResult.value

		if (phone) {
			const existingPhone = await this.props.profileRepository.findByPhone(
				phone.value
			)

			if (existingPhone && existingPhone.userId !== existingProfile.userId)
				return failure(PhoneAlreadyRegisteredError)
		}

		existingProfile.updateDetails({ name: input.name, phone, now: now() })

		await this.props.profileRepository.update(existingProfile)
		await existingProfile.dispatchDomainEvents(this.props.domainEvents)

		return success({ profile: existingProfile })
	}
}
