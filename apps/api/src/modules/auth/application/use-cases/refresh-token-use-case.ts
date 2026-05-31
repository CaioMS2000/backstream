import { failure, Result, success } from '@backstream/core/result'
import { InvalidRefreshTokenError } from '../@errors/invalid-refresh-token-error'
import { TokenReplayDetectedError } from '../@errors/token-replay-detected-error'
import type { JwtTokenGenerator } from '../jwt'
import type { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import { UserRepository } from '../repositories/user-repository'
import { TokenIssuer } from '../services/token-issuer'

export type RefreshTokenUseCaseRequest = {
	refreshToken: string
}

export type RefreshTokenUseCaseResponse = Result<
	InvalidRefreshTokenError | TokenReplayDetectedError,
	{
		accessToken: string
		refreshToken: string
	}
>

type UseCaseProps = {
	refreshTokenRepository: RefreshTokenRepository
	userRepository: UserRepository
	tokenGenerator: JwtTokenGenerator
	tokenIssuer: TokenIssuer
}

export class RefreshTokenUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: RefreshTokenUseCaseRequest
	): Promise<RefreshTokenUseCaseResponse> {
		const tokenHash = await this.props.tokenGenerator.hashRefreshToken(
			input.refreshToken
		)

		const stored =
			await this.props.refreshTokenRepository.findByTokenHash(tokenHash)

		if (!stored) {
			return failure(InvalidRefreshTokenError)
		}

		const marked = await this.props.refreshTokenRepository.markUsed(tokenHash)

		if (!marked) {
			await this.props.refreshTokenRepository.revokeAllForUser(stored.userId)
			return failure(TokenReplayDetectedError)
		}

		const user = await this.props.userRepository.findById(stored.userId)

		if (!user || user.isRevoked()) {
			await this.props.refreshTokenRepository.revoke(tokenHash)
			return failure(InvalidRefreshTokenError)
		}

		const { accessToken, refreshToken } = await this.props.tokenIssuer.issue({
			userId: user.id,
			email: user.email.value,
			roles: user.roles,
		})

		await this.props.refreshTokenRepository.revoke(tokenHash)

		return success({
			accessToken,
			refreshToken,
		})
	}
}
