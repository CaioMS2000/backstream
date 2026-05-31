import { Result } from '@backstream/core'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Role } from '../../domain/role'
import { AuthenticatedUser } from '../types/authenticated-user'

export type CreateCredentialsFromProviderCommandInput = {
	provider: string
	providerAccountId: string
	email: string
	role: Role
}
export type CreateCredentialsFromProviderCommandOutput = Result<
	InvalidValueError,
	{ user: AuthenticatedUser }
>

export abstract class CreateCredentialsFromProviderCommand {
	abstract execute(
		input: CreateCredentialsFromProviderCommandInput
	): Promise<CreateCredentialsFromProviderCommandOutput>
}
