import { AuthModuleApplicationError } from './app-error'

export class InvalidCredentialsError extends AuthModuleApplicationError {
	constructor() {
		super('Invalid credentials')
	}
}
