import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { initializeClock } from '@/shared/infrastructure/clock'
import { initializeIdGenerator } from '@/shared/infrastructure/id-generator'

async function bootstrap() {
	// 1. Config primeiro — valida env, falha cedo se algo faltar
	const { env } = await import('@/config/env')

	// 2. Singletons globais
	initializeIdGenerator('v7')
	initializeClock()

	// 3. Imports dinâmicos (após env validado)
	const { app } = await import('@/http/app')
	const { IntegrationEventBus } = await import(
		'@backstream/core/events/integration-event-bus'
	)
	const { TokenService } = await import(
		'@/modules/auth/infrastructure/auth/token-service'
	)
	const { PasswordService } = await import(
		'@/modules/auth/infrastructure/auth/password-service'
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
	const { DrizzleRefreshTokenRepository } = await import(
		'@/modules/auth/infrastructure/database/repositories/refresh-token-repository'
	)
	const { buildAuthModule } = await import('@/modules/auth/auth-module')
	const { registerAuthRoutes } = await import(
		'@/modules/auth/infrastructure/http/routes'
	)
	const { makeAuthGuard } = await import('@/http/middleware/auth/authed')
	const { makeAuthed } = await import('@/http/auth-factory')

	// 4. Infra compartilhada
	const integrationBus = new IntegrationEventBus()
	const tokenService = new TokenService()
	const passwordService = new PasswordService()

	// 5. Repos drizzle
	const userRepository = new DrizzleUserRepository()
	const passwordCredentialRepository = new DrizzlePasswordCredentialRepository()
	const oauthAccountRepository = new DrizzleOAuthAccountRepository()
	const refreshTokenRepository = new DrizzleRefreshTokenRepository()

	// 6. Módulos (puros — domínio + use cases)
	const authModule = buildAuthModule({
		userRepository,
		passwordCredentialRepository,
		oauthAccountRepository,
		refreshTokenRepository,
		hashGenerator: passwordService,
		hashVerifier: passwordService,
		jwtService: tokenService,
		tokenGenerator: tokenService,
		integrationBus,
	})

	// 7. Primitivas HTTP de auth (criadas UMA vez)
	const authenticate = makeAuthGuard(authModule.services.accessTokenVerifier)
	const authed = makeAuthed(authenticate)

	// 8. Wireup HTTP de cada módulo — embrulhado em `register` para entrar na
	// fila de plugins e ser executado APÓS swagger/scalar/etc., garantindo que
	// o `onRoute` hook do swagger capture as rotas (e elas apareçam em /openapi.json).
	app.register(async instance => {
		registerAuthRoutes({
			app: instance.withTypeProvider<ZodTypeProvider>(),
			authModule,
			authed,
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
