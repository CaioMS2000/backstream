import type { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import type { AuthModule } from '@/modules/auth/auth-module'
import { LoginRoute } from './login'
import { MeRoute } from './me'

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
	new MeRoute({ app, authed }).register()
}
