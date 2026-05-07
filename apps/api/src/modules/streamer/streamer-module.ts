import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import type { IntegrationEventBus } from '@backstream/core/events/integration-event-bus'
import type { UserSummaryQuery } from '../auth/public/queries/user-summary-query'
import type { StreamerRepository } from './application/repositories/streamer-repository'
import { ChangeStreamerSlugUseCase } from './application/use-cases/change-streamer-slug-use-case'
import { OnboardStreamerUseCase } from './application/use-cases/onboard-streamer-use-case'
import { RenameStreamerUseCase } from './application/use-cases/rename-streamer-use-case'
import { UpdateStreamerPixKeyUseCase } from './application/use-cases/update-streamer-pix-key-use-case'

export type StreamerModuleDependencies = {
	streamerRepository: StreamerRepository
	userSummaryQuery: UserSummaryQuery
	integrationBus: IntegrationEventBus
}

export type StreamerModule = {
	domainEvents: DomainEventDispatcher
	useCases: {
		onboardStreamer: OnboardStreamerUseCase
		renameStreamer: RenameStreamerUseCase
		changeStreamerSlug: ChangeStreamerSlugUseCase
		updateStreamerPixKey: UpdateStreamerPixKeyUseCase
	}
}

function registerDomainHandlers(
	_domainEvents: DomainEventDispatcher,
	_deps: StreamerModuleDependencies
): void {
	// Intencionalmente vazio até termos handlers internos do streamer.
}

function registerIntegrationSubscribers(
	_deps: StreamerModuleDependencies
): void {
	// Intencionalmente vazio. Pontos de extensão futura:
	//   deps.integrationBus.subscribe(UserRevoked, ...) → desativar Streamer
	//   deps.integrationBus.subscribe(UserEmailChanged, ...) → invalidar caches
	// `UserRegistered` não é escutado: onboarding de streamer é explícito via
	//   OnboardStreamerUseCase (precisa de slug/displayName/pixKey, que não vêm
	//   no UserRegistered).
}

export function buildStreamerModule(
	deps: StreamerModuleDependencies
): StreamerModule {
	const domainEvents = new DomainEventDispatcher()
	registerDomainHandlers(domainEvents, deps)
	registerIntegrationSubscribers(deps)

	const onboardStreamer = new OnboardStreamerUseCase({
		streamerRepository: deps.streamerRepository,
		userSummaryQuery: deps.userSummaryQuery,
		domainEvents,
		integrationBus: deps.integrationBus,
	})

	const renameStreamer = new RenameStreamerUseCase({
		streamerRepository: deps.streamerRepository,
		domainEvents,
	})

	const changeStreamerSlug = new ChangeStreamerSlugUseCase({
		streamerRepository: deps.streamerRepository,
		domainEvents,
	})

	const updateStreamerPixKey = new UpdateStreamerPixKeyUseCase({
		streamerRepository: deps.streamerRepository,
		domainEvents,
	})

	return {
		domainEvents,
		useCases: {
			onboardStreamer,
			renameStreamer,
			changeStreamerSlug,
			updateStreamerPixKey,
		},
	}
}
