import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import type { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import type { HashGenerator } from './application/cryptography/hash-generator'
import type { HashVerifier } from './application/cryptography/hash-verifier'
import type { JwtService, JwtTokenGenerator } from './application/jwt'
import type { OAuthAccountRepository } from './application/repositories/oauth-account-repository'
import type { OAuthStateRepository } from './application/repositories/oauth-state-repository'
import type { PasswordCredentialRepository } from './application/repositories/password-credential-repository'
import type { RefreshTokenRepository } from './application/repositories/refresh-token-repository'
import type { UserRepository } from './application/repositories/user-repository'
import { LoginUseCase } from './application/use-cases/login-use-case'
import { LogoutUseCase } from './application/use-cases/logout-use-case'
import { RefreshTokenUseCase } from './application/use-cases/refresh-token-use-case'
import { RegisterUseCase } from './application/use-cases/register-use-case'
import { SocialLoginUseCase } from './application/use-cases/social-login-use-case'
import type { Role } from './domain/role'
import type { OAuthProviderService } from './infrastructure/auth/oauth-provider-service'
import { UserSummaryQueryFromRepo } from './infrastructure/queries/user-summary-query-from-repo'
import type { UserSummaryQuery } from './public/queries/user-summary-query'
import { AccessTokenVerifier } from './public/services/access-token-verifier'
import type { AuthenticatedUser } from './public/types/authenticated-user'

export type AuthModuleDependencies = {
	userRepository: UserRepository
	passwordCredentialRepository: PasswordCredentialRepository
	oauthAccountRepository: OAuthAccountRepository
	oauthStateRepository: OAuthStateRepository
	refreshTokenRepository: RefreshTokenRepository
	hashGenerator: HashGenerator
	hashVerifier: HashVerifier
	jwtService: JwtService
	tokenGenerator: JwtTokenGenerator
	oauthProviderService: OAuthProviderService
	integrationBus: IntegrationEventBus
}

export type AuthModule = {
	domainEvents: DomainEventDispatcher
	queries: {
		userSummary: UserSummaryQuery
	}
	services: {
		accessTokenVerifier: AccessTokenVerifier
		oauthProvider: OAuthProviderService
		oauthState: OAuthStateRepository
	}
	useCases: {
		register: RegisterUseCase
		socialLogin: SocialLoginUseCase
		login: LoginUseCase
		logout: LogoutUseCase
		refreshToken: RefreshTokenUseCase
	}
}

function registerDomainHandlers(
	_domainEvents: DomainEventDispatcher,
	_deps: AuthModuleDependencies
): void {
	// Intencionalmente vazio até termos handlers internos do módulo auth.
}

export function buildAuthModule(deps: AuthModuleDependencies): AuthModule {
	const domainEvents = new DomainEventDispatcher()
	registerDomainHandlers(domainEvents, deps)

	const userSummaryQuery = new UserSummaryQueryFromRepo(deps.userRepository)

	const accessTokenVerifier: AccessTokenVerifier =
		new (class extends AccessTokenVerifier {
			async verify(token: string): Promise<AuthenticatedUser | null> {
				const payload = await deps.jwtService.verifyAccessToken(token)
				if (!payload) return null
				if (typeof payload.sub !== 'string') return null
				if (typeof payload.email !== 'string') return null
				if (!Array.isArray(payload.roles)) return null
				return {
					userId: payload.sub,
					email: payload.email,
					roles: payload.roles as Role[],
				}
			}
		})()

	const register = new RegisterUseCase({
		userRepository: deps.userRepository,
		passwordCredentialRepository: deps.passwordCredentialRepository,
		hashGenerator: deps.hashGenerator,
		domainEvents,
		integrationBus: deps.integrationBus,
	})

	const socialLogin = new SocialLoginUseCase({
		userRepository: deps.userRepository,
		oauthAccountRepository: deps.oauthAccountRepository,
		refreshTokenRepository: deps.refreshTokenRepository,
		jwtService: deps.jwtService,
		tokenGenerator: deps.tokenGenerator,
		domainEvents,
		integrationBus: deps.integrationBus,
	})

	const login = new LoginUseCase({
		userRepository: deps.userRepository,
		passwordCredentialRepository: deps.passwordCredentialRepository,
		refreshTokenRepository: deps.refreshTokenRepository,
		hashVerifier: deps.hashVerifier,
		jwtService: deps.jwtService,
		tokenGenerator: deps.tokenGenerator,
	})

	const logout = new LogoutUseCase({
		refreshTokenRepository: deps.refreshTokenRepository,
		tokenGenerator: deps.tokenGenerator,
	})

	const refreshToken = new RefreshTokenUseCase({
		userRepository: deps.userRepository,
		refreshTokenRepository: deps.refreshTokenRepository,
		jwtService: deps.jwtService,
		tokenGenerator: deps.tokenGenerator,
	})

	return {
		domainEvents,
		queries: {
			userSummary: userSummaryQuery,
		},
		services: {
			accessTokenVerifier,
			oauthProvider: deps.oauthProviderService,
			oauthState: deps.oauthStateRepository,
		},
		useCases: {
			register,
			socialLogin,
			login,
			logout,
			refreshToken,
		},
	}
}
