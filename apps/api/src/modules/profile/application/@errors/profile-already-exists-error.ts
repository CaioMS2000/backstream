import { ProfileModuleApplicationError } from './app-error'

export class ProfileAlreadyExistsError extends ProfileModuleApplicationError {
	constructor() {
		super('Profile already exists')
	}
}
