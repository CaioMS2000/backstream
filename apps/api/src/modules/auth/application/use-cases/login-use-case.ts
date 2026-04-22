import { failure, Result, success } from '@backstream/core/result'
import { AuthenticatedUser } from '../../domain/authenticated-user'
import { InvalidCredentialsError } from '../@errors'
import { HashVerifier } from '../cryptography/hash-verifier'
import { JwtService, JwtTokenGenerator } from '../jwt'
import { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import { credentialRepository } from '../repositories/credential-repository'
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
	credentialRepository: credentialRepository
}

export class LoginUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(input: LoginUseCaseRequest): Promise<LoginUseCaseResponse> {
		const credential = await this.props.credentialRepository.findByEmail(
			input.email
		)

		if (!credential) {
			return failure(InvalidCredentialsError)
		}

		const passwordValid = await this.props.hashVerifier.verify(
			credential.hash,
			input.password
		)

		if (!passwordValid) {
			return failure(InvalidCredentialsError)
		}

		const accessToken = await this.props.jwtService.signAccessToken({
			sub: credential.userId,
			email: credential.email,
			roles: credential.roles,
		})
		const refreshTokenValue =
			await this.props.tokenGenerator.generateRefreshToken()
		const refreshTokenHash =
			await this.props.tokenGenerator.hashRefreshToken(refreshTokenValue)
		const refreshToken = await RefreshToken.issue(
			credential.userId,
			refreshTokenHash,
			now(),
			REFRESH_TOKEN_EXPIRY_SECONDS
		)

		await this.props.refreshTokenRepository.save(refreshToken)

		return success({
			accessToken,
			refreshToken: refreshTokenValue,
			user: {
				id: credential.id,
				email: credential.email.value,
				roles: credential.roles,
			},
		})
	}
}
