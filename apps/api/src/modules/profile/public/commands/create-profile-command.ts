import { Result } from '@backstream/core'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Profile } from '@/modules/profile/domain/profile'
import { PhoneAlreadyRegisteredError } from '../../application/@errors'
import { ProfileAlreadyExistsError } from '../../application/@errors/profile-already-exists-error'

export type CreateProfileCommandInput = Omit<
	Parameters<typeof Profile.create>[0],
	'phone'
> & { phone: string | null }
export type CreateProfileCommandOutput = Result<
	PhoneAlreadyRegisteredError | ProfileAlreadyExistsError | InvalidValueError,
	{
		userId: string
		name: string
		phone: string | null
		avatarUrl: string | null
	}
>

export abstract class CreateProfileCommand {
	abstract execute({
		id,
		name,
		now,
		phone,
		userId,
	}: CreateProfileCommandInput): Promise<CreateProfileCommandOutput>
}
