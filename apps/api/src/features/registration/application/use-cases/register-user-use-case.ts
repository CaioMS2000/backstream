import type { FailureOf, Result } from '@backstream/core'
import {
	failure,
	IntegrationEventBus,
	success,
	UniqueId,
} from '@backstream/core'
import { UniqueUsernameProfileCreator } from '@/features/registration/application/unique-username-profile-creator'
import { RegistrationCompleted } from '@/features/registration/public/events/registration-completed'
import { AuthModule } from '@/modules/auth/auth-module'
import {
	CreateCredentialsCommandInput,
	CreateCredentialsCommandOutput,
} from '@/modules/auth/public/commands/create-credentials-command'
import { IssueTokensCommandInput } from '@/modules/auth/public/commands/issue-tokens-command'
import { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'
import { CreateProfileCommandOutput } from '@/modules/profile/public/commands/create-profile-command'
import { IntegrationBusAfterCommit } from '@/shared/events/integration-bus-after-commit'
import { now } from '@/shared/infrastructure/clock'
import { generateId } from '@/shared/infrastructure/id-generator'
import { RollbackSignal } from '@/shared/transaction/rollback-signal'
import { TransactionRunner } from '@/shared/transaction/transaction-runner'

type Props = {
	txRunner: TransactionRunner
	auth: AuthModule
	profileCreator: UniqueUsernameProfileCreator
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
		const events = new IntegrationBusAfterCommit(this.eventsAfterCommit)
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
				const name = email.split('@')[0]
				const profileId = await generateId()

				const createProfileResult = await this.profileCreator.create(
					name,
					username => ({
						userId: uniqueUserId,
						name,
						id: profileId,
						now: rightNow,
						phone: null,
						avatarUrl: null,
						username,
					})
				)

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

				events.enqueue(registrationCompletedEvent)

				return success({ ...tokens, user })
			})
		} catch (err) {
			if (err instanceof RegisterUserRollback) {
				return failure(err.outcome)
			}
			throw err
		}

		await events.flush()

		return result
	}

	get txRunner() {
		return this.props.txRunner
	}

	get profileCreator() {
		return this.props.profileCreator
	}

	get auth() {
		return this.props.auth
	}

	get eventsAfterCommit() {
		return this.props.eventsAfterCommit
	}
}
