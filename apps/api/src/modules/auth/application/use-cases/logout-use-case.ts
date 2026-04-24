import { Result, success } from '@backstream/core/result'
import type { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import type { JwtTokenGenerator } from '../jwt'

export type LogoutUseCaseRequest = {
	refreshToken: string
}

export type LogoutUseCaseResponse = Result<never, undefined>

type UseCaseProps = {
	tokenGenerator: JwtTokenGenerator
	refreshTokenRepository: RefreshTokenRepository
}

export class LogoutUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(input: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
		const tokenHash = await this.props.tokenGenerator.hashRefreshToken(
			input.refreshToken
		)
		await this.props.refreshTokenRepository.revoke(tokenHash)
		return success(undefined)
	}
}
