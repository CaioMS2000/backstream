import type { RegistrationFeature } from '@/features/registration/registration-feature'
import type { HttpApp } from '@/http/app'
import type { AuthModule } from '@/modules/auth/auth-module'
import { GoogleSocialLoginCallbackRoute } from './social/google/google-social-login-callback'
import { RegisterRoute } from './register'

type RegisterRegistrationRoutesDeps = {
	app: HttpApp
	registrationFeature: RegistrationFeature
	authModule: AuthModule
}

export function registerRegistrationRoutes({
	app,
	registrationFeature,
	authModule,
}: RegisterRegistrationRoutesDeps) {
	new RegisterRoute({
		app,
		registerUserUseCase: registrationFeature.useCases.registerUser,
	}).register()
	new GoogleSocialLoginCallbackRoute({
		app,
		oauthProviderService: authModule.services.oauthProvider,
		oauthStateRepository: authModule.services.oauthState,
		registerUserViaSocialUseCase:
			registrationFeature.useCases.registerUserViaSocial,
	}).register()
}
