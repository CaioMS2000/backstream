import { AsyncLocalStorage } from 'node:async_hooks'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { initializeClock } from '@/shared/infrastructure/clock'
import { initializeIdGenerator } from '@/shared/infrastructure/id-generator'
import type { DrizzleTx } from '@/shared/transaction/db-context'

async function bootstrap() {
	// 1. Config primeiro — valida env, falha cedo se algo faltar
	const { env } = await import('@/config/env')

	// 2. Singletons globais
	initializeIdGenerator('v7')
	initializeClock()

	// 3. Imports dinâmicos (após env validado)
	const { createApp } = await import('@/http/app')
	const { createDrizzle } = await import('@/lib/drizzle')
	const { DrizzleTransactionService } = await import(
		'@/shared/transaction/drizzle-transaction-service'
	)
	const { IntegrationEventBus } = await import(
		'@backstream/core/events/integration-event-bus'
	)
	const { TokenService } = await import(
		'@/modules/auth/infrastructure/auth/token-service'
	)
	const { PasswordService } = await import(
		'@/modules/auth/infrastructure/auth/password-service'
	)
	const { OAuthProviderService } = await import(
		'@/modules/auth/infrastructure/auth/oauth-provider-service'
	)
	const { GoogleOAuthAdapter } = await import(
		'@/modules/auth/infrastructure/auth/oauth-adapters/google-oauth-adapter'
	)
	const { DrizzleUserRepository } = await import(
		'@/modules/auth/infrastructure/database/repositories/user-repository'
	)
	const { DrizzlePasswordCredentialRepository } = await import(
		'@/modules/auth/infrastructure/database/repositories/password-credential-repository'
	)
	const { DrizzleOAuthAccountRepository } = await import(
		'@/modules/auth/infrastructure/database/repositories/oauth-account-repository'
	)
	const { DrizzleOAuthStateRepository } = await import(
		'@/modules/auth/infrastructure/database/repositories/oauth-state-repository'
	)
	const { DrizzleRefreshTokenRepository } = await import(
		'@/modules/auth/infrastructure/database/repositories/refresh-token-repository'
	)
	const { buildAuthModule } = await import('@/modules/auth/auth-module')
	const { registerAuthRoutes } = await import(
		'@/modules/auth/infrastructure/http/routes'
	)
	const { DrizzleProfileRepository } = await import(
		'@/modules/profile/infrastructure/database/repositories/profile-repository'
	)
	const { buildProfileModule } = await import(
		'@/modules/profile/profile-module'
	)
	const { registerProfileRoutes } = await import(
		'@/modules/profile/infrastructure/http/routes'
	)
	const { buildRegistrationFeature } = await import(
		'@/features/registration/registration-feature'
	)
	const { registerRegistrationRoutes } = await import(
		'@/features/registration/infrastructure/http/routes'
	)
	const { makeAuthGuard } = await import('@/http/middleware/auth/authed')
	const { makeAuthed } = await import('@/http/auth-factory')

	const app = createApp()
	const db = createDrizzle(env.DATABASE_URL)

	// 4. Infra compartilhada
	const txService = new DrizzleTransactionService(
		db,
		new AsyncLocalStorage<DrizzleTx>()
	)
	const integrationBus = new IntegrationEventBus()
	const tokenService = new TokenService()
	const passwordService = new PasswordService()
	const oauthProviderService = new OAuthProviderService([
		new GoogleOAuthAdapter({
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			redirectUri: env.GOOGLE_REDIRECT_URI,
		}),
	])

	// 5. Repos drizzle
	const userRepository = new DrizzleUserRepository(txService)
	const passwordCredentialRepository = new DrizzlePasswordCredentialRepository(
		txService
	)
	const oauthAccountRepository = new DrizzleOAuthAccountRepository(txService)
	const oauthStateRepository = new DrizzleOAuthStateRepository(txService)
	const refreshTokenRepository = new DrizzleRefreshTokenRepository(txService)
	const profileRepository = new DrizzleProfileRepository(txService)

	// 6. Módulos (puros — domínio + use cases)
	const authModule = buildAuthModule({
		userRepository,
		passwordCredentialRepository,
		oauthAccountRepository,
		oauthStateRepository,
		refreshTokenRepository,
		hashGenerator: passwordService,
		hashVerifier: passwordService,
		jwtService: tokenService,
		tokenGenerator: tokenService,
		oauthProviderService,
		integrationBus,
	})

	const profileModule = buildProfileModule({
		integrationBus,
		profileRepository,
	})

	const registrationFeature = buildRegistrationFeature({
		txRunner: txService,
		authModule,
		profileModule,
		integrationBus,
	})

	// 7. Primitivas HTTP de auth (criadas UMA vez)
	const authenticate = makeAuthGuard(authModule.services.accessTokenVerifier)
	const authed = makeAuthed(authenticate)

	const { ProfileSummaryComposer } = await import(
		'@/shared/http/profile-summary-composer'
	)
	const profileComposer = new ProfileSummaryComposer(
		profileModule.queries.profileSummary
	)

	// 8. Wireup HTTP de cada módulo — embrulhado em `register` para entrar na
	// fila de plugins e ser executado APÓS swagger/scalar/etc., garantindo que
	// o `onRoute` hook do swagger capture as rotas (e elas apareçam em /openapi.json).
	app.register(async instance => {
		registerAuthRoutes({
			app: instance.withTypeProvider<ZodTypeProvider>(),
			authModule,
			authed,
			profileComposer,
		})
	})

	app.register(async instance => {
		registerProfileRoutes({
			app: instance.withTypeProvider<ZodTypeProvider>(),
			profileModule,
			authed,
		})
	})

	app.register(async instance => {
		registerRegistrationRoutes({
			app: instance.withTypeProvider<ZodTypeProvider>(),
			registrationFeature,
			authModule,
			profileComposer,
		})
	})

	// TODO: streamer-module quando a infra concreta (DrizzleStreamerRepository + rotas) existir.

	// 9. Sobe
	await app.listen({ port: env.PORT, host: '0.0.0.0' })
	console.log(`api listening on ${env.PORT}`)
}

bootstrap().catch(err => {
	console.error('System bootstrap failed', err)
	process.exit(1)
})
