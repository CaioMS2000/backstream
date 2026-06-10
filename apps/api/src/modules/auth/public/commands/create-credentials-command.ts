import { Result } from '@backstream/core'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { EmailAlreadyRegisteredError } from '../../application/@errors'
import { Role } from '../../domain/role'
import { AuthenticatedUser } from '../types/authenticated-user'

export type CreateCredentialsCommandInput = {
	email: string
	password: string
	role: Role
}
export type CreateCredentialsCommandOutput = Result<
	EmailAlreadyRegisteredError | InvalidValueError,
	{
		user: AuthenticatedUser
	}
>

export abstract class CreateCredentialsCommand {
	abstract execute(
		input: CreateCredentialsCommandInput
	): Promise<CreateCredentialsCommandOutput>
}
