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
import { generateId } from '@/shared/infrastructure/id-generator'
import { Profile } from '../../domain/profile'
import { PhoneAlreadyRegisteredError } from '../@errors'
import { ProfileAlreadyExistsError } from '../@errors/profile-already-exists-error'
import { ProfileRepository } from '../repositories/profile-repository'

export type CreateProfileUseCaseRequest = {
	name: string
	phone: string | null
	userId: string
}

export type CreateProfileUseCaseResponse = Result<
	PhoneAlreadyRegisteredError | ProfileAlreadyExistsError | InvalidValueError,
	{ profile: Profile }
>

type UseCaseProps = {
	profileRepository: ProfileRepository
	domainEvents: DomainEventDispatcher
}

export class CreateProfileUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: CreateProfileUseCaseRequest
	): Promise<CreateProfileUseCaseResponse> {
		const phoneResult = Phone.createOptional(input.phone)

		if (phoneResult.isFailure()) return failure(phoneResult.value)

		const phone = phoneResult.value

		if (phone) {
			const existingPhone = await this.props.profileRepository.findByPhone(
				phone.value
			)
			if (existingPhone) return failure(PhoneAlreadyRegisteredError)
		}

		const existingProfile = await this.props.profileRepository.findByUserId(
			UniqueId(input.userId)
		)

		if (existingProfile) return failure(ProfileAlreadyExistsError)

		const profile = Profile.create({
			id: await generateId(),
			userId: UniqueId(input.userId),
			name: input.name,
			phone,
			now: now(),
		})

		await this.props.profileRepository.save(profile)
		await profile.dispatchDomainEvents(this.props.domainEvents)

		return success({ profile })
	}
}
