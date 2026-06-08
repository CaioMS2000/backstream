import {
	failure,
	IntegrationEvent,
	IntegrationEventBus,
	success,
	UniqueId,
} from '@backstream/core'
import type { FailureOf, Result } from '@backstream/core'
import { AuthModule } from '@/modules/auth/auth-module'
import {
	CreateCredentialsCommandInput,
	CreateCredentialsCommandOutput,
} from '@/modules/auth/public/commands/create-credentials-command'
import { IssueTokensCommandInput } from '@/modules/auth/public/commands/issue-tokens-command'
import { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'
import { RegistrationCompleted } from '@/features/registration/public/events/registration-completed'
import { ProfileModule } from '@/modules/profile/profile-module'
import {
	CreateProfileCommandInput,
	CreateProfileCommandOutput,
} from '@/modules/profile/public/commands/create-profile-command'
import { now } from '@/shared/infrastructure/clock'
import { generateId } from '@/shared/infrastructure/id-generator'
import { RollbackSignal } from '@/shared/transaction/rollback-signal'
import { TransactionRunner } from '@/shared/transaction/transaction-runner'

type Props = {
	txRunner: TransactionRunner
	auth: AuthModule
	profile: ProfileModule
	eventsAfterCommit: IntegrationEventBus
}

type RegisterUserError =
	| FailureOf<CreateCredentialsCommandOutput>
	| FailureOf<CreateProfileCommandOutput>

type Output = Result<
	RegisterUserError,
	{ accessToken: string; refreshToken: string; user: AuthenticatedUser }
>

export type Input = CreateCredentialsCommandInput // possibilidade de expandir no futuro sem quebrar a interface do use case.

class RegisterUserRollback extends RollbackSignal<RegisterUserError> {}

export class RegisterUserUseCase {
	constructor(private props: Props) {}

	async execute(input: Input): Promise<Output> {
		const eventsAfterCommit: IntegrationEvent[] = []
		let result: Output
		try {
			result = await this.txRunner.run(async () => {
				const rightNow = now()
				const credentialsResult =
					await this.auth.commands.createCredentials.execute(input)

				if (credentialsResult.isFailure()) {
					throw new RegisterUserRollback(credentialsResult.value)
				}

				const { user } = credentialsResult.value
				const { email, roles, userId } = user
				const uniqueUserId = UniqueId(userId)
				const createProfileInput: CreateProfileCommandInput = {
					userId: uniqueUserId,
					name: email.split('@')[0],
					id: await generateId(),
					now: rightNow,
					phone: null,
				}

				const createProfileResult =
					await this.profile.commands.createProfile.execute(createProfileInput)

				if (createProfileResult.isFailure()) {
					throw new RegisterUserRollback(createProfileResult.value)
				}

				const { userId: userId2 } = createProfileResult.value

				if (userId !== userId2) {
					throw new Error(
						'User ID mismatch between created credentials and profile'
					)
				}

				const issueTokensInput: IssueTokensCommandInput = {
					user: {
						email,
						roles,
						userId,
					},
				}
				const tokens =
					await this.auth.commands.issueTokens.execute(issueTokensInput)
				const registrationCompletedEvent = new RegistrationCompleted(
					uniqueUserId,
					email,
					rightNow
				)

				eventsAfterCommit.push(registrationCompletedEvent)

				return success({ ...tokens, user })
			})
		} catch (err) {
			if (err instanceof RegisterUserRollback) {
				return failure(err.outcome)
			}
			throw err
		}

		// Subscribers rodam APÓS o commit e são aguardados (await).
		// Se um handler lançar, esta request falha embora o usuário JÁ esteja
		// persistido. Mover pra try/catch ou outbox se algum handler não puder
		// derrubar a resposta. Ver docs/adr/0001-dispatch-de-eventos-pos-commit.md
		for (const event of eventsAfterCommit) {
			await this.eventsAfterCommit.publish(event)
		}

		return result
	}

	get txRunner() {
		return this.props.txRunner
	}

	get profile() {
		return this.props.profile
	}

	get auth() {
		return this.props.auth
	}

	get eventsAfterCommit() {
		return this.props.eventsAfterCommit
	}
}
