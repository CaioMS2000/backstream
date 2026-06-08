import type { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import type { AuthModule } from '@/modules/auth/auth-module'
import { LoginRoute } from './login'
import { LogoutRoute } from './logout'
import { MeRoute } from './me'
import { RefreshTokenRoute } from './refresh-token'
import { GoogleSocialLoginStartRoute } from './social-login/google'

type RegisterAuthRoutesDeps = {
	app: HttpApp
	authModule: AuthModule
	authed: Authed
}

export function registerAuthRoutes({
	app,
	authModule,
	authed,
}: RegisterAuthRoutesDeps) {
	new LoginRoute({ app, loginUseCase: authModule.useCases.login }).register()
	new MeRoute({
		app,
		authed,
		userSummaryQuery: authModule.queries.userSummary,
	}).register()
	new LogoutRoute({
		app,
		authed,
		logoutUseCase: authModule.useCases.logout,
	}).register()
	new RefreshTokenRoute({
		app,
		refreshTokenUseCase: authModule.useCases.refreshToken,
	}).register()
	new GoogleSocialLoginStartRoute({
		app,
		oauthProviderService: authModule.services.oauthProvider,
		oauthStateRepository: authModule.services.oauthState,
	}).register()
}
