import { AuthModuleApplicationError } from './app-error'

export class EmailAlreadyRegisteredError extends AuthModuleApplicationError {
	constructor() {
		super('Email already registered')
	}
}
