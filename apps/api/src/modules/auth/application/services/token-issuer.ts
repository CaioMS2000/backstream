import { UniqueId } from '@backstream/core'
import { now } from '@/shared/infrastructure/clock'
import { generateId } from '@/shared/infrastructure/id-generator'
import { RefreshToken } from '../../domain/refresh-token'
import { AuthenticatedUser } from '../../public/types/authenticated-user'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '../constants'
import { JwtService, JwtTokenGenerator } from '../jwt'
import { RefreshTokenRepository } from '../repositories/refresh-token-repository'

export type IssuedTokens = {
	accessToken: string
	refreshToken: string
}

type Props = {
	jwtService: JwtService
	tokenGenerator: JwtTokenGenerator
	refreshTokenRepository: RefreshTokenRepository
}

export class TokenIssuer {
	constructor(private readonly props: Props) {}

	async issue(user: AuthenticatedUser): Promise<IssuedTokens> {
		const accessToken = await this.props.jwtService.signAccessToken({
			sub: user.userId,
			email: user.email,
			roles: user.roles,
		})

		const refreshTokenValue =
			await this.props.tokenGenerator.generateRefreshToken()
		const refreshTokenHash =
			await this.props.tokenGenerator.hashRefreshToken(refreshTokenValue)
		const refreshToken = RefreshToken.issue({
			id: await generateId(),
			userId: UniqueId(user.userId),
			value: refreshTokenHash,
			now: now(),
			lifetimeMs: REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
		})

		await this.props.refreshTokenRepository.insert(refreshToken)

		return {
			accessToken,
			refreshToken: refreshTokenValue,
		}
	}
}
