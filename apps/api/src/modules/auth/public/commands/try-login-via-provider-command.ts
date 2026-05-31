import { AuthenticatedUser } from '../types/authenticated-user'

export type TryLoginViaProviderCommandInput = {
	provider: string
	providerAccountId: string
	email: string
}
export type TryLoginViaProviderCommandOutput = {
	user: AuthenticatedUser
	isExistingLink: boolean
} | null

export abstract class TryLoginViaProviderCommand {
	abstract execute(
		input: TryLoginViaProviderCommandInput
	): Promise<TryLoginViaProviderCommandOutput>
}
