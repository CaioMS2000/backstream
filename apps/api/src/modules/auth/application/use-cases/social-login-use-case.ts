import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { failure, Result, success } from '@backstream/core/result'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Email } from '@/shared/domain'
import { now } from '@/shared/infrastructure/clock'
import { UserRegistered } from '../../contracts/events/user-registered'
import { AuthenticatedUser } from '../../domain/authenticated-user'
import { RefreshToken } from '../../domain/refresh-token'
import { Role } from '../../domain/role'
import { User } from '../../domain/user'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '../constants'
import { JwtService, JwtTokenGenerator } from '../jwt'
import { OAuthAccountRepository } from '../repositories/oauth-account-repository'
import { RefreshTokenRepository } from '../repositories/refresh-token-repository'
import { UserRepository } from '../repositories/user-repository'

export type SocialLoginUseCaseRequest = {
	provider: string
	providerAccountId: string
	email: string
	name: string
	role: Extract<Role, 'streamer' | 'viewer'>
}

export type SocialLoginUseCaseResponse = Result<
	InvalidValueError,
	{
		accessToken: string
		refreshToken: string
		user: AuthenticatedUser
		isNewUser: boolean
	}
>

type UseCaseProps = {
	userRepository: UserRepository
	oauthAccountRepository: OAuthAccountRepository
	refreshTokenRepository: RefreshTokenRepository
	jwtService: JwtService
	tokenGenerator: JwtTokenGenerator
	domainEvents: DomainEventDispatcher
	integrationBus: IntegrationEventBus
}

export class SocialLoginUseCase {
	constructor(protected props: UseCaseProps) {}

	async execute(
		input: SocialLoginUseCaseRequest
	): Promise<SocialLoginUseCaseResponse> {
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
				return this.issueTokens(linkedUser, false)
			}
		}

		const userByEmail = await this.props.userRepository.findByEmail(input.email)

		if (userByEmail) {
			await this.props.oauthAccountRepository.save({
				userId: userByEmail.id,
				provider: input.provider,
				providerAccountId: input.providerAccountId,
			})
			return this.issueTokens(userByEmail, false)
		}

		const emailResult = Email.create(input.email)

		if (emailResult.isFailure()) {
			return failure(emailResult.value)
		}

		const user = await User.create({
			email: emailResult.value,
			name: input.name,
			phone: null,
			roles: [input.role],
			now: now(),
		})

		await this.props.userRepository.save(user)
		await this.props.oauthAccountRepository.save({
			userId: user.id,
			provider: input.provider,
			providerAccountId: input.providerAccountId,
		})

		await user.dispatchDomainEvents(this.props.domainEvents)
		await this.props.integrationBus.publish(
			new UserRegistered(user.id, user.email.value, now())
		)

		return this.issueTokens(user, true)
	}

	private async issueTokens(
		user: User,
		isNewUser: boolean
	): Promise<SocialLoginUseCaseResponse> {
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
			isNewUser,
		})
	}
}
