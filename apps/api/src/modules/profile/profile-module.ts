import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import type { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { CreateProfileUseCase } from './application/use-cases/create-profile-use-case'
import { UpdateProfileUseCase } from './application/use-cases/update-profile-use-case'
import { ProfileRepository } from './application/repositories/profile-repository'

export type ProfileModuleDependencies = {
	integrationBus: IntegrationEventBus
	profileRepository: ProfileRepository
}

export type ProfileModule = {
	domainEvents: DomainEventDispatcher
	useCases: {
		createProfile: CreateProfileUseCase
		updateProfile: UpdateProfileUseCase
	}
}

function registerDomainHandlers(
	_domainEvents: DomainEventDispatcher,
	_deps: ProfileModuleDependencies
): void {
	// Intencionalmente vazio até termos handlers internos do profile.
}

function registerIntegrationSubscribers(
	_deps: ProfileModuleDependencies
): void {
	// Intencionalmente vazio. O módulo de profile não tem eventos de integração para escutar no momento.
}

export function buildProfileModule(
	deps: ProfileModuleDependencies
): ProfileModule {
	const domainEvents = new DomainEventDispatcher()
	registerDomainHandlers(domainEvents, deps)
	registerIntegrationSubscribers(deps)

	return {
		domainEvents,
		useCases: {
			createProfile: new CreateProfileUseCase({
				profileRepository: deps.profileRepository,
				domainEvents,
			}),
			updateProfile: new UpdateProfileUseCase({
				profileRepository: deps.profileRepository,
				domainEvents,
			}),
		},
	}
}
