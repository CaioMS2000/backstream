import { ProfileModuleApplicationError } from './app-error'

export class PhoneAlreadyRegisteredError extends ProfileModuleApplicationError {
	constructor() {
		super('Phone already registered')
	}
}
