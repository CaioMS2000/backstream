import {
	DomainEventDispatcher,
	failure,
	Result,
	success,
	UniqueId,
} from '@backstream/core'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Phone, Username } from '@/shared/domain'
import { now } from '@/shared/infrastructure/clock'
import { generateId } from '@/shared/infrastructure/id-generator'
import { Profile } from '../../domain/profile'
import {
	PhoneAlreadyRegisteredError,
	UsernameAlreadyTakenError,
} from '../@errors'
import { ProfileAlreadyExistsError } from '../@errors/profile-already-exists-error'
import { ProfileRepository } from '../repositories/profile-repository'

export type CreateProfileUseCaseRequest = {
	name: string
	phone: string | null
	avatarUrl: string | null
	userId: string
	username: string
}

export type CreateProfileUseCaseResponse = Result<
	| PhoneAlreadyRegisteredError
	| UsernameAlreadyTakenError
	| ProfileAlreadyExistsError
	| InvalidValueError,
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
		const usernameResult = Username.create(input.username)

		if (usernameResult.isFailure()) return failure(usernameResult.value)

		const phoneResult = Phone.createOptional(input.phone)

		if (phoneResult.isFailure()) return failure(phoneResult.value)

		const phone = phoneResult.value

		if (phone) {
			const existingPhone =
				await this.props.profileRepository.findByPhone(phone)
			if (existingPhone) return failure(PhoneAlreadyRegisteredError)
		}

		const existingProfile = await this.props.profileRepository.findByUserId(
			UniqueId(input.userId)
		)

		if (existingProfile) return failure(ProfileAlreadyExistsError)

		const existingUsername = await this.props.profileRepository.findByUsername(
			usernameResult.value
		)

		if (existingUsername) return failure(UsernameAlreadyTakenError)

		const profile = Profile.create({
			id: await generateId(),
			userId: UniqueId(input.userId),
			name: input.name,
			username: usernameResult.value,
			phone,
			avatarUrl: input.avatarUrl,
			now: now(),
		})

		await this.props.profileRepository.insert(profile)
		await profile.dispatchDomainEvents(this.props.domainEvents)

		return success({ profile })
	}
}
