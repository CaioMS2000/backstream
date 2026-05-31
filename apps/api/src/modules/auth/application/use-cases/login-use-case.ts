import { failure, Result, success } from '@backstream/core/result'
import { Email } from '@/shared/domain'
import { AuthenticatedUser } from '../../public/types/authenticated-user'
import { InvalidCredentialsError } from '../@errors'
import { HashVerifier } from '../cryptography/hash-verifier'
import { PasswordCredentialRepository } from '../repositories/password-credential-repository'
import { UserRepository } from '../repositories/user-repository'
import { TokenIssuer } from '../services/token-issuer'

export type LoginUseCaseRequest = {
	email: string
	password: string
}

export type LoginUseCaseResponse = Result<
	InvalidCredentialsError,
	{
		accessToken: string
		refreshToken: string
		user: AuthenticatedUser
	}
>

type UseCaseProps = {
	hashVerifier: HashVerifier
	userRepository: UserRepository
	passwordCredentialRepository: PasswordCredentialRepository
	tokenIssuer: TokenIssuer
}

export class LoginUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(input: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
		const user = await this.props.userRepository.findByEmail(
			Email.normalize(input.email)
		)

		if (!user || user.isRevoked()) {
			return failure(InvalidCredentialsError)
		}

		const passwordCredential =
			await this.props.passwordCredentialRepository.findByUserId(user.id)

		if (!passwordCredential || passwordCredential.isRevoked()) {
			return failure(InvalidCredentialsError)
		}

		const passwordValid = await this.props.hashVerifier.verify(
			passwordCredential.hash,
			input.password
		)

		if (!passwordValid) {
			return failure(InvalidCredentialsError)
		}

		const authenticatedUser: AuthenticatedUser = {
			userId: user.id,
			email: user.email.value,
			roles: user.roles,
		}

		const { accessToken, refreshToken } =
			await this.props.tokenIssuer.issue(authenticatedUser)

		return success({
			accessToken,
			refreshToken,
			user: authenticatedUser,
		})
	}
}
