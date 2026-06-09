import type { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import type { AuthModule } from '@/modules/auth/auth-module'
import type { ProfileModule } from '@/modules/profile/profile-module'
import type { TransactionRunner } from '@/shared/transaction/transaction-runner'
import { RegisterUserUseCase } from './application/use-cases/register-user-use-case'
import { RegisterUserViaSocialUseCase } from './application/use-cases/register-user-via-social-use-case'

export type RegistrationFeatureDependencies = {
	txRunner: TransactionRunner
	authModule: AuthModule
	profileModule: ProfileModule
	integrationBus: IntegrationEventBus
}

export type RegistrationFeature = {
	useCases: {
		registerUser: RegisterUserUseCase
		registerUserViaSocial: RegisterUserViaSocialUseCase
	}
}

export function buildRegistrationFeature(
	deps: RegistrationFeatureDependencies
): RegistrationFeature {
	const registerUser = new RegisterUserUseCase({
		txRunner: deps.txRunner,
		auth: deps.authModule,
		profile: deps.profileModule,
		eventsAfterCommit: deps.integrationBus,
	})

	const registerUserViaSocial = new RegisterUserViaSocialUseCase({
		txRunner: deps.txRunner,
		auth: deps.authModule,
		profile: deps.profileModule,
		eventsAfterCommit: deps.integrationBus,
	})

	return {
		useCases: {
			registerUser,
			registerUserViaSocial,
		},
	}
}
