import {
	IssueTokensCommand,
	IssueTokensCommandInput,
	IssueTokensCommandOutput,
} from '../../public/commands/issue-tokens-command'
import { TokenIssuer } from '../services/token-issuer'

type Props = {
	tokenIssuer: TokenIssuer
}

export class IssueTokensCommandImpl extends IssueTokensCommand {
	constructor(protected props: Props) {
		super()
	}

	async execute({
		user,
	}: IssueTokensCommandInput): Promise<IssueTokensCommandOutput> {
		return this.props.tokenIssuer.issue(user)
	}
}
