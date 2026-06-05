import { failure, success } from '@backstream/core'
import {
	CreateProfileCommand,
	CreateProfileCommandInput,
	CreateProfileCommandOutput,
} from '../../public/commands/create-profile-command'
import { CreateProfileUseCase } from '../use-cases/create-profile-use-case'

type Dependencies = {
	createProfileUseCase: CreateProfileUseCase
}

export class CreateProfileCommandImpl extends CreateProfileCommand {
	constructor(private props: Dependencies) {
		super()
	}

	get createProfileUseCase() {
		return this.props.createProfileUseCase
	}

	async execute(
		input: CreateProfileCommandInput
	): Promise<CreateProfileCommandOutput> {
		const result = await this.createProfileUseCase.execute(input)

		if (result.isFailure()) {
			return failure(result.value)
		}

		const { profile } = result.value

		return success({
			userId: profile.userId,
			name: profile.name,
			phone: profile.phone?.value ?? null,
		})
	}
}
