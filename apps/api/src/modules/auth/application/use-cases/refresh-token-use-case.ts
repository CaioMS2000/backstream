import { failure, Result, success } from '@backstream/core/result'
import type { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import type { JwtService } from '../jwt'
import type { JwtTokenGenerator } from '../jwt'
import { InvalidRefreshTokenError } from '../@errors/invalid-refresh-token-error'
import { TokenReplayDetectedError } from '../@errors/token-replay-detected-error'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '../constants'
import { UniqueId } from '@backstream/core/unique-id'
import { credentialRepository } from '../repositories/credential-repository'
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
	credentialRepository: credentialRepository
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

		// Atomic mark-as-used: returns false if already used (race condition or replay)
		const marked = await this.props.refreshTokenRepository.markUsed(tokenHash)

		if (!marked) {
			await this.props.refreshTokenRepository.revokeAllForUser(stored.userId)
			return failure(TokenReplayDetectedError)
		}

		let user: { id: UniqueId; email: string; roles: string[] } | null = null
		const credential = await this.props.credentialRepository.findByUserId(
			stored.userId
		)

		if (credential) {
			user = {
				id: credential.userId,
				email: credential.email.value,
				roles: credential.roles,
			}
		}

		if (!user) {
			await this.props.refreshTokenRepository.revoke(tokenHash)
			return failure(InvalidRefreshTokenError)
		}

		// Generate new token pair
		const accessToken = await this.props.jwtService.signAccessToken({
			sub: user.id,
			email: user.email,
			role: user.roles,
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

		// Revoke old token
		await this.props.refreshTokenRepository.revoke(tokenHash)

		return success({
			accessToken,
			refreshToken: newRefreshToken,
		})
	}
}
