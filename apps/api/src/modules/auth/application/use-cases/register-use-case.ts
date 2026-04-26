import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { failure, Result, success } from '@backstream/core/result'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Email, Phone } from '@/shared/domain'
import { now } from '@/shared/infrastructure/clock'
import { UserRegistered } from '../../contracts/events/user-registered'
import { AuthenticatedUser } from '../../domain/authenticated-user'
import { PasswordCredential } from '../../domain/password-credential'
import { Role } from '../../domain/role'
import { User } from '../../domain/user'
import {
	EmailAlreadyRegisteredError,
	PhoneAlreadyRegisteredError,
} from '../@errors'
import { HashGenerator } from '../cryptography/hash-generator'
import { PasswordCredentialRepository } from '../repositories/password-credential-repository'
import { UserRepository } from '../repositories/user-repository'

export type RegisterUseCaseRequest = {
	name: string
	email: string
	password: string
	phone: string
	role: Role
}

export type RegisterUseCaseResponse = Result<
	EmailAlreadyRegisteredError | PhoneAlreadyRegisteredError | InvalidValueError,
	{
		user: AuthenticatedUser
	}
>

type UseCaseProps = {
	userRepository: UserRepository
	passwordCredentialRepository: PasswordCredentialRepository
	hashGenerator: HashGenerator
	domainEvents: DomainEventDispatcher
	integrationBus: IntegrationEventBus
}

export class RegisterUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: RegisterUseCaseRequest
	): Promise<RegisterUseCaseResponse> {
		const existing = await this.props.userRepository.findByEmail(input.email)

		if (existing) {
			return failure(EmailAlreadyRegisteredError)
		}

		const emailResult = Email.create(input.email)

		if (emailResult.isFailure()) {
			return failure(emailResult.value)
		}

		const phoneResult = Phone.create(input.phone)

		if (phoneResult.isFailure()) {
			return failure(phoneResult.value)
		}

		const existingPhone = await this.props.userRepository.findByPhone(
			phoneResult.value.value
		)

		if (existingPhone) {
			return failure(PhoneAlreadyRegisteredError)
		}

		const user = await User.create({
			email: emailResult.value,
			name: input.name,
			phone: phoneResult.value,
			roles: [input.role],
			now: now(),
		})
		await this.props.userRepository.save(user)

		const passwordHash = await this.props.hashGenerator.hash(input.password)
		const passwordCredential = await PasswordCredential.create({
			userId: user.id,
			passwordHash,
			now: now(),
		})
		await this.props.passwordCredentialRepository.save(passwordCredential)

		await user.dispatchDomainEvents(this.props.domainEvents)
		await this.props.integrationBus.publish(
			new UserRegistered(user.id, user.email.value, now())
		)

		return success({
			user: {
				id: user.id,
				email: user.email.value,
				roles: user.roles,
			},
		})
	}
}
