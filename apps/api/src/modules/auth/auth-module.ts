import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import type { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { CreateCredentialsCommandImpl } from './application/commands/create-credentials-command'
import { CreateCredentialsFromProviderCommandImpl } from './application/commands/create-credentials-from-provider-command'
import { IssueTokensCommandImpl } from './application/commands/issue-tokens-command'
import { TryLoginViaProviderCommandImpl } from './application/commands/try-login-via-provider-command'
import type { HashGenerator } from './application/cryptography/hash-generator'
import type { HashVerifier } from './application/cryptography/hash-verifier'
import type { JwtService, JwtTokenGenerator } from './application/jwt'
import type { OAuthAccountRepository } from './application/repositories/oauth-account-repository'
import type { OAuthStateRepository } from './application/repositories/oauth-state-repository'
import type { PasswordCredentialRepository } from './application/repositories/password-credential-repository'
import type { RefreshTokenRepository } from './application/repositories/refresh-token-repository'
import type { UserRepository } from './application/repositories/user-repository'
import { TokenIssuer } from './application/services/token-issuer'
import { LoginUseCase } from './application/use-cases/login-use-case'
import { LogoutUseCase } from './application/use-cases/logout-use-case'
import { RefreshTokenUseCase } from './application/use-cases/refresh-token-use-case'
import { JwtAccessTokenVerifier } from './infrastructure/auth/jwt-access-token-verifier'
import type { OAuthProviderService } from './infrastructure/auth/oauth-provider-service'
import { UserSummaryQueryFromRepo } from './infrastructure/queries/user-summary-query-from-repo'
import type { CreateCredentialsCommand } from './public/commands/create-credentials-command'
import type { CreateCredentialsFromProviderCommand } from './public/commands/create-credentials-from-provider-command'
import type { IssueTokensCommand } from './public/commands/issue-tokens-command'
import type { TryLoginViaProviderCommand } from './public/commands/try-login-via-provider-command'
import type { UserSummaryQuery } from './public/queries/user-summary-query'
import type { AccessTokenVerifier } from './public/services/access-token-verifier'

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
	commands: {
		createCredentials: CreateCredentialsCommand
		createCredentialsFromProvider: CreateCredentialsFromProviderCommand
		issueTokens: IssueTokensCommand
		tryLoginViaProvider: TryLoginViaProviderCommand
	}
	services: {
		accessTokenVerifier: AccessTokenVerifier
		oauthProvider: OAuthProviderService
		oauthState: OAuthStateRepository
	}
	useCases: {
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

	const accessTokenVerifier: AccessTokenVerifier = new JwtAccessTokenVerifier(
		deps.jwtService
	)

	const tokenIssuer = new TokenIssuer({
		jwtService: deps.jwtService,
		tokenGenerator: deps.tokenGenerator,
		refreshTokenRepository: deps.refreshTokenRepository,
	})

	const login = new LoginUseCase({
		userRepository: deps.userRepository,
		passwordCredentialRepository: deps.passwordCredentialRepository,
		hashVerifier: deps.hashVerifier,
		tokenIssuer,
	})

	const logout = new LogoutUseCase({
		refreshTokenRepository: deps.refreshTokenRepository,
		tokenGenerator: deps.tokenGenerator,
	})

	const refreshToken = new RefreshTokenUseCase({
		userRepository: deps.userRepository,
		refreshTokenRepository: deps.refreshTokenRepository,
		tokenGenerator: deps.tokenGenerator,
		tokenIssuer,
	})

	const createCredentials = new CreateCredentialsCommandImpl({
		userRepository: deps.userRepository,
		passwordCredentialRepository: deps.passwordCredentialRepository,
		hashGenerator: deps.hashGenerator,
	})

	const createCredentialsFromProvider =
		new CreateCredentialsFromProviderCommandImpl({
			userRepository: deps.userRepository,
			oauthAccountRepository: deps.oauthAccountRepository,
		})

	const tryLoginViaProvider = new TryLoginViaProviderCommandImpl({
		userRepository: deps.userRepository,
		oauthAccountRepository: deps.oauthAccountRepository,
	})

	const issueTokens = new IssueTokensCommandImpl({
		tokenIssuer,
	})

	return {
		domainEvents,
		queries: {
			userSummary: userSummaryQuery,
		},
		commands: {
			createCredentials,
			createCredentialsFromProvider,
			tryLoginViaProvider,
			issueTokens,
		},
		services: {
			accessTokenVerifier,
			oauthProvider: deps.oauthProviderService,
			oauthState: deps.oauthStateRepository,
		},
		useCases: {
			login,
			logout,
			refreshToken,
		},
	}
}
