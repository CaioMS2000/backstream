import type { FailureOf, Result } from '@backstream/core'
import {
	failure,
	IntegrationEventBus,
	success,
	UniqueId,
} from '@backstream/core'
import { RegistrationCompleted } from '@/features/registration/public/events/registration-completed'
import { AuthModule } from '@/modules/auth/auth-module'
import {
	CreateCredentialsFromProviderCommandInput,
	CreateCredentialsFromProviderCommandOutput,
} from '@/modules/auth/public/commands/create-credentials-from-provider-command'
import { SocialUserRegistered } from '@/modules/auth/public/events/social-user-registered'
import { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'
import { ProfileModule } from '@/modules/profile/profile-module'
import { CreateProfileCommandOutput } from '@/modules/profile/public/commands/create-profile-command'
import { IntegrationBusAfterCommit } from '@/shared/events/integration-bus-after-commit'
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

type RegisterUserViaSocialError =
	| FailureOf<CreateCredentialsFromProviderCommandOutput>
	| FailureOf<CreateProfileCommandOutput>

type Output = Result<
	RegisterUserViaSocialError,
	{
		accessToken: string
		refreshToken: string
		user: AuthenticatedUser
		isNewUser: boolean
	}
>

export type Input = CreateCredentialsFromProviderCommandInput & { name: string }

class RegisterUserViaSocialRollback extends RollbackSignal<RegisterUserViaSocialError> {}

export class RegisterUserViaSocialUseCase {
	constructor(private props: Props) {}

	async execute(input: Input): Promise<Output> {
		const existing = await this.auth.commands.tryLoginViaProvider.execute({
			provider: input.provider,
			providerAccountId: input.providerAccountId,
			email: input.email,
		})

		if (existing) {
			const tokens = await this.auth.commands.issueTokens.execute({
				user: existing.user,
			})
			return success({
				...tokens,
				user: existing.user,
				isNewUser: false,
			})
		}

		const events = new IntegrationBusAfterCommit(this.eventsAfterCommit)
		let result: Output
		try {
			result = await this.txRunner.run(async () => {
				const rightNow = now()

				const credentialsResult =
					await this.auth.commands.createCredentialsFromProvider.execute({
						provider: input.provider,
						providerAccountId: input.providerAccountId,
						email: input.email,
						role: input.role,
					})

				if (credentialsResult.isFailure()) {
					throw new RegisterUserViaSocialRollback(credentialsResult.value)
				}

				const { user } = credentialsResult.value
				const { email, roles, userId } = user
				const uniqueUserId = UniqueId(userId)

				const createProfileResult =
					await this.profile.commands.createProfile.execute({
						userId: uniqueUserId,
						name: input.name,
						id: await generateId(),
						now: rightNow,
						phone: null,
						avatarUrl: null,
					})

				if (createProfileResult.isFailure()) {
					throw new RegisterUserViaSocialRollback(createProfileResult.value)
				}

				if (userId !== createProfileResult.value.userId) {
					throw new Error(
						'User ID mismatch between created credentials and profile'
					)
				}

				const tokens = await this.auth.commands.issueTokens.execute({
					user: { email, roles, userId },
				})

				events.enqueue(new RegistrationCompleted(uniqueUserId, email, rightNow))
				events.enqueue(
					new SocialUserRegistered(uniqueUserId, { name: input.name }, rightNow)
				)

				return success({ ...tokens, user, isNewUser: true })
			})
		} catch (err) {
			if (err instanceof RegisterUserViaSocialRollback) {
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
