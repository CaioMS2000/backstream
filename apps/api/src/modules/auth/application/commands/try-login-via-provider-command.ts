import { Email } from '@/shared/domain'
import { User } from '../../domain/user'
import {
	TryLoginViaProviderCommand,
	TryLoginViaProviderCommandInput,
	TryLoginViaProviderCommandOutput,
} from '../../public/commands/try-login-via-provider-command'
import { AuthenticatedUser } from '../../public/types/authenticated-user'
import { OAuthAccountRepository } from '../repositories/oauth-account-repository'
import { UserRepository } from '../repositories/user-repository'

type Props = {
	userRepository: UserRepository
	oauthAccountRepository: OAuthAccountRepository
}

export class TryLoginViaProviderCommandImpl extends TryLoginViaProviderCommand {
	constructor(protected props: Props) {
		super()
	}

	async execute(
		input: TryLoginViaProviderCommandInput
	): Promise<TryLoginViaProviderCommandOutput> {
		const existingLink =
			await this.props.oauthAccountRepository.findByProviderAndAccountId(
				input.provider,
				input.providerAccountId
			)

		if (existingLink) {
			const linkedUser = await this.props.userRepository.findById(
				existingLink.userId
			)

			if (linkedUser) {
				return {
					isExistingLink: true,
					user: this.toAuthenticatedUser(linkedUser),
				}
			}
		}

		const userByEmail = await this.props.userRepository.findByEmail(
			Email.normalize(input.email)
		)

		if (userByEmail) {
			return {
				isExistingLink: false,
				user: this.toAuthenticatedUser(userByEmail),
			}
		}

		return null
	}

	private toAuthenticatedUser(user: User): AuthenticatedUser {
		return {
			userId: user.id,
			email: user.email.value,
			roles: user.roles,
		}
	}
}
