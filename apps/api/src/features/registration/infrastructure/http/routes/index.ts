import type { RegistrationFeature } from '@/features/registration/registration-feature'
import type { HttpApp } from '@/http/app'
import type { AuthModule } from '@/modules/auth/auth-module'
import type { ProfileSummaryComposer } from '@/shared/http/profile-summary-composer'
import { RegisterRoute } from './register'
import { GoogleSocialLoginCallbackRoute } from './social/google/google-social-login-callback'

type RegisterRegistrationRoutesDeps = {
	app: HttpApp
	registrationFeature: RegistrationFeature
	authModule: AuthModule
	profileComposer: ProfileSummaryComposer
}

export function registerRegistrationRoutes({
	app,
	registrationFeature,
	authModule,
	profileComposer,
}: RegisterRegistrationRoutesDeps) {
	new RegisterRoute({
		app,
		registerUserUseCase: registrationFeature.useCases.registerUser,
		profileComposer,
	}).register()
	new GoogleSocialLoginCallbackRoute({
		app,
		oauthProviderService: authModule.services.oauthProvider,
		oauthStateRepository: authModule.services.oauthState,
		registerUserViaSocialUseCase:
			registrationFeature.useCases.registerUserViaSocial,
	}).register()
}
