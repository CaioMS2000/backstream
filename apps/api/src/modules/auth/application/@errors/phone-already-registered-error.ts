import { AuthModuleApplicationError } from './app-error'

export class PhoneAlreadyRegisteredError extends AuthModuleApplicationError {
	constructor() {
		super('Phone already registered')
	}
}
