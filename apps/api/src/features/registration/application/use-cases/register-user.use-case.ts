import {
	failure,
	IntegrationEvent,
	IntegrationEventBus,
	success,
	UniqueId,
} from '@backstream/core'
import { AuthModule } from '@/modules/auth/auth-module'
import { CreateCredentialsCommandInput } from '@/modules/auth/public/commands/create-credentials-command'
import { IssueTokensCommandInput } from '@/modules/auth/public/commands/issue-tokens-command'
import { UserRegistered } from '@/modules/auth/public/events/user-registered'
import { ProfileModule } from '@/modules/profile/profile-module'
import { CreateProfileCommandInput } from '@/modules/profile/public/commands/create-profile-command'
import { now } from '@/shared/infrastructure/clock'
import { generateId } from '@/shared/infrastructure/id-generator'
import { TransactionRunner } from '@/shared/transaction/transaction-runner'

type Props = {
	txRunner: TransactionRunner
	auth: AuthModule
	profile: ProfileModule
	eventsAfterCommit: IntegrationEventBus
}

export type Input = CreateCredentialsCommandInput // possibilidade de expandir no futuro sem quebrar a interface do use case.

export class RegisterUserUseCase {
	constructor(private props: Props) {}

	async execute(input: Input) {
		const eventsAfterCommit: IntegrationEvent[] = []
		const result = await this.txRunner.run(async () => {
			const rightNow = now()
			const credentialsResult =
				await this.auth.commands.createCredentials.execute(input)

			if (credentialsResult.isFailure()) {
				return failure(credentialsResult.value)
			}

			const { user } = credentialsResult.value
			const { email, roles, userId } = user
			const createProfileInput: CreateProfileCommandInput = {
				userId: UniqueId(userId),
				name: email.split('@')[0],
				id: await generateId(),
				now: rightNow,
				phone: null,
			}

			const createProfileResult =
				await this.profile.commands.createProfile.execute(createProfileInput)

			if (createProfileResult.isFailure()) {
				return failure(createProfileResult.value)
			}

			const {
				name: _name,
				phone: _phone,
				userId: userId2,
			} = createProfileResult.value

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
			const userRegisteredEvent = new UserRegistered(
				UniqueId(userId),
				email,
				rightNow
			)

			eventsAfterCommit.push(userRegisteredEvent)

			return success({ ...tokens, userId })
		})

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
