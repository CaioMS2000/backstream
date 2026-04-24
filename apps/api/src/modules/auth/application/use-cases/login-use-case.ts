import { failure, Result, success } from '@backstream/core/result'
import { AuthenticatedUser } from '../../domain/authenticated-user'
import { InvalidCredentialsError } from '../@errors'
import { HashVerifier } from '../cryptography/hash-verifier'
import { JwtService, JwtTokenGenerator } from '../jwt'
import { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import { UserRepository } from '../repositories/user-repository'
import { PasswordCredentialRepository } from '../repositories/password-credential-repository'
import { RefreshToken } from '../../domain/refresh-token'
import { now } from '@/shared/infrastructure/clock'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '../constants'

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
	jwtService: JwtService
	tokenGenerator: JwtTokenGenerator
	refreshTokenRepository: RefreshTokenRepository
	userRepository: UserRepository
	passwordCredentialRepository: PasswordCredentialRepository
}

export class LoginUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(input: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
		const user = await this.props.userRepository.findByEmail(input.email)

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

		const accessToken = await this.props.jwtService.signAccessToken({
			sub: user.id,
			email: user.email.value,
			roles: user.roles,
		})
		const refreshTokenValue =
			await this.props.tokenGenerator.generateRefreshToken()
		const refreshTokenHash =
			await this.props.tokenGenerator.hashRefreshToken(refreshTokenValue)
		const refreshToken = await RefreshToken.issue(
			user.id,
			refreshTokenHash,
			now(),
			REFRESH_TOKEN_EXPIRY_SECONDS
		)

		await this.props.refreshTokenRepository.save(refreshToken)

		return success({
			accessToken,
			refreshToken: refreshTokenValue,
			user: {
				id: user.id,
				email: user.email.value,
				roles: user.roles,
			},
		})
	}
}
