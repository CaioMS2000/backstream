import type { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import type { AuthModule } from '@/modules/auth/auth-module'
import type { ProfileSummaryComposer } from '@/shared/http/profile-summary-composer'
import { LoginRoute } from './login'
import { LogoutRoute } from './logout'
import { MeRoute } from './me'
import { RefreshTokenRoute } from './refresh-token'
import { ManageRolesRoute } from './roles'
import { GoogleSocialLoginStartRoute } from './social-login/google'

type RegisterAuthRoutesDeps = {
	app: HttpApp
	authModule: AuthModule
	authed: Authed
	profileComposer: ProfileSummaryComposer
}

export function registerAuthRoutes({
	app,
	authModule,
	authed,
	profileComposer,
}: RegisterAuthRoutesDeps) {
	new LoginRoute({
		app,
		loginUseCase: authModule.useCases.login,
		profileComposer,
	}).register()
	new MeRoute({
		app,
		authed,
		userSummaryQuery: authModule.queries.userSummary,
		profileComposer,
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
	new ManageRolesRoute({
		app,
		authed,
		addRoleUseCase: authModule.useCases.addRole,
		removeRoleUseCase: authModule.useCases.removeRole,
	}).register()
	new GoogleSocialLoginStartRoute({
		app,
		oauthProviderService: authModule.services.oauthProvider,
		oauthStateRepository: authModule.services.oauthState,
	}).register()
}
