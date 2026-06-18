import { failure, success } from '@backstream/core/result'
import { Email } from '@/shared/domain'
import { now } from '@/shared/infrastructure/clock'
import { PasswordCredential } from '../../domain/password-credential'
import { User } from '../../domain/user'
import {
	CreateCredentialsCommand,
	CreateCredentialsCommandInput,
	CreateCredentialsCommandOutput,
} from '../../public/commands/create-credentials-command'
import { EmailAlreadyRegisteredError } from '../@errors'
import { HashGenerator } from '../cryptography/hash-generator'
import { PasswordCredentialRepository } from '../repositories/password-credential-repository'
import { UserRepository } from '../repositories/user-repository'

type Props = {
	userRepository: UserRepository
	passwordCredentialRepository: PasswordCredentialRepository
	hashGenerator: HashGenerator
}

export class CreateCredentialsCommandImpl extends CreateCredentialsCommand {
	constructor(protected props: Props) {
		super()
	}

	get userRepository() {
		return this.props.userRepository
	}

	get passwordCredentialRepository() {
		return this.props.passwordCredentialRepository
	}

	get hashGenerator() {
		return this.props.hashGenerator
	}

	async execute(
		input: CreateCredentialsCommandInput
	): Promise<CreateCredentialsCommandOutput> {
		const emailResult = Email.create(input.email)

		if (emailResult.isFailure()) return failure(emailResult.value)

		const email = emailResult.value
		const existingEmail = await this.userRepository.findByEmail(email.value)

		if (existingEmail) return failure(EmailAlreadyRegisteredError)

		const user = await User.create({
			email,
			roles: [input.role],
			now: now(),
		})

		await this.userRepository.insert(user)

		const passwordHash = await this.hashGenerator.hash(input.password)
		const passwordCredential = await PasswordCredential.create({
			userId: user.id,
			passwordHash,
			now: now(),
		})

		await this.passwordCredentialRepository.insert(passwordCredential)

		return success({
			user: {
				userId: user.id,
				email: user.email.value,
				roles: user.roles,
			},
		})
	}
}
