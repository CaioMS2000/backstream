import { failure, success } from '@backstream/core'
import { Email } from '@/shared/domain'
import { now } from '@/shared/infrastructure/clock'
import { User } from '../../domain/user'
import {
	CreateCredentialsFromProviderCommand,
	CreateCredentialsFromProviderCommandInput,
	CreateCredentialsFromProviderCommandOutput,
} from '../../public/commands/create-credentials-from-provider-command'
import { OAuthAccountRepository } from '../repositories/oauth-account-repository'
import { UserRepository } from '../repositories/user-repository'

type Props = {
	userRepository: UserRepository
	oauthAccountRepository: OAuthAccountRepository
}

export class CreateCredentialsFromProviderCommandImpl extends CreateCredentialsFromProviderCommand {
	constructor(protected props: Props) {
		super()
	}

	async execute(
		input: CreateCredentialsFromProviderCommandInput
	): Promise<CreateCredentialsFromProviderCommandOutput> {
		const emailResult = Email.create(input.email)

		if (emailResult.isFailure()) {
			return failure(emailResult.value)
		}

		const user = await User.create({
			email: emailResult.value,
			roles: [input.role],
			now: now(),
		})

		await this.props.userRepository.insert(user)
		await this.props.oauthAccountRepository.insert({
			userId: user.id,
			provider: input.provider,
			providerAccountId: input.providerAccountId,
		})

		return success({
			user: {
				userId: user.id,
				email: user.email.value,
				roles: user.roles,
			},
		})
	}
}
