import type { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import type { ProfileModule } from '@/modules/profile/profile-module'
import { UpdateProfileRoute } from './update-profile'

type RegisterProfileRoutesDeps = {
	app: HttpApp
	profileModule: ProfileModule
	authed: Authed
}

export function registerProfileRoutes({
	app,
	profileModule,
	authed,
}: RegisterProfileRoutesDeps) {
	new UpdateProfileRoute({
		app,
		authed,
		updateProfileUseCase: profileModule.useCases.updateProfile,
	}).register()
}
