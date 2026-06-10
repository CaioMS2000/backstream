import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import type { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import { CreateProfileCommandImpl } from './application/commands/create-profile-command'
import { ProfileRepository } from './application/repositories/profile-repository'
import { CreateProfileUseCase } from './application/use-cases/create-profile-use-case'
import { UpdateProfileUseCase } from './application/use-cases/update-profile-use-case'
import { ProfileSummaryQueryFromRepo } from './infrastructure/queries/profile-summary-query-from-repo'
import { CreateProfileCommand } from './public/commands/create-profile-command'
import type { ProfileSummaryQuery } from './public/queries/profile-summary-query'

export type ProfileModuleDependencies = {
	// Mantido como seam para futuros subscribers do profile (sem listener hoje —
	// o profile no fluxo social é criado pelo orquestrador em features/registration).
	integrationBus: IntegrationEventBus
	profileRepository: ProfileRepository
}

export type ProfileModule = {
	domainEvents: DomainEventDispatcher
	queries: {
		profileSummary: ProfileSummaryQuery
	}
	commands: {
		createProfile: CreateProfileCommand
	}
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

export function buildProfileModule(
	deps: ProfileModuleDependencies
): ProfileModule {
	const domainEvents = new DomainEventDispatcher()

	const createProfileUseCase = new CreateProfileUseCase({
		profileRepository: deps.profileRepository,
		domainEvents,
	})
	const updateProfileUseCase = new UpdateProfileUseCase({
		profileRepository: deps.profileRepository,
		domainEvents,
	})

	const profileSummaryQuery = new ProfileSummaryQueryFromRepo(
		deps.profileRepository
	)
	const createProfileCommand = new CreateProfileCommandImpl({
		createProfileUseCase,
	})

	registerDomainHandlers(domainEvents, deps)

	return {
		domainEvents,
		queries: {
			profileSummary: profileSummaryQuery,
		},
		commands: {
			createProfile: createProfileCommand,
		},
		useCases: {
			createProfile: createProfileUseCase,
			updateProfile: updateProfileUseCase,
		},
	}
}
