import { failure, Result, success } from '@backstream/core/result'
import type { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import type { JwtService } from '../jwt'
import type { JwtTokenGenerator } from '../jwt'
import { InvalidRefreshTokenError } from '../@errors/invalid-refresh-token-error'
import { TokenReplayDetectedError } from '../@errors/token-replay-detected-error'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '../constants'
import { UserRepository } from '../repositories/user-repository'
import { RefreshToken } from '../../domain/refresh-token'
import { now } from '@/shared/infrastructure/clock'

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
	jwtService: JwtService
	tokenGenerator: JwtTokenGenerator
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

		const accessToken = await this.props.jwtService.signAccessToken({
			sub: user.id,
			email: user.email.value,
			roles: user.roles,
		})

		const newRefreshToken =
			await this.props.tokenGenerator.generateRefreshToken()
		const newRefreshTokenHash =
			await this.props.tokenGenerator.hashRefreshToken(newRefreshToken)

		await this.props.refreshTokenRepository.save(
			await RefreshToken.issue(
				user.id,
				newRefreshTokenHash,
				now(),
				REFRESH_TOKEN_EXPIRY_SECONDS
			)
		)

		await this.props.refreshTokenRepository.revoke(tokenHash)

		return success({
			accessToken,
			refreshToken: newRefreshToken,
		})
	}
}
