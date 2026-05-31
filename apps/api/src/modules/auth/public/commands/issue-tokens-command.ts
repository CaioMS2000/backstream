import { AuthenticatedUser } from '../types/authenticated-user'

export type IssueTokensCommandInput = { user: AuthenticatedUser }
export type IssueTokensCommandOutput = {
	accessToken: string
	refreshToken: string
}

export abstract class IssueTokensCommand {
	abstract execute(
		input: IssueTokensCommandInput
	): Promise<IssueTokensCommandOutput>
}
