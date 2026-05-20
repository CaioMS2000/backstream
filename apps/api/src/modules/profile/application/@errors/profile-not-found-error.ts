import { ProfileModuleApplicationError } from './app-error'

export class ProfileNotFoundError extends ProfileModuleApplicationError {
	constructor() {
		super('Profile not found')
	}
}
