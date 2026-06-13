import {
	CreateProfileCommand,
	CreateProfileCommandInput,
	CreateProfileCommandOutput,
	UsernameAlreadyTakenError,
} from '@/modules/profile/public/commands/create-profile-command'
import { Username } from '@/shared/domain'
import { generateId } from '@/shared/infrastructure/id-generator'

const MAX_USERNAME_ATTEMPTS = 5

/**
 * Cria um profile derivando um username válido e único a partir de um seed
 * livre (nome ou local part do email). Sanitiza via `Username.createFromText`
 * e, em colisão, tenta de novo com um sufixo curto — o registro nunca falha por
 * username já existente. O constraint UNIQUE do banco é o backstop p/ corridas.
 *
 * Encapsula a *policy* de geração de username da feature de registro. É um
 * colaborador de aplicação (não um use case): quem orquestra o registro é o
 * RegisterUser*UseCase, que delega aqui a sub-decisão "como achar um username".
 */
export class UniqueUsernameProfileCreator {
	constructor(private readonly createProfile: CreateProfileCommand) {}

	async create(
		seed: string,
		makeInput: (username: string) => CreateProfileCommandInput
	): Promise<CreateProfileCommandOutput> {
		const base = Username.createFromText(seed).value || 'user'
		let username =
			base.length >= Username.MIN_LENGTH
				? base
				: `${base}_${await this.shortSuffix()}`

		for (let attempt = 0; ; attempt++) {
			const result = await this.createProfile.execute(makeInput(username))

			if (result.isSuccess()) return result

			const isUsernameConflict =
				result.value instanceof UsernameAlreadyTakenError
			if (!isUsernameConflict || attempt >= MAX_USERNAME_ATTEMPTS) return result

			username = `${base}_${await this.shortSuffix()}`
		}
	}

	private async shortSuffix(): Promise<string> {
		const id = await generateId()
		return id.toString().replace(/-/g, '').slice(0, 8)
	}
}
