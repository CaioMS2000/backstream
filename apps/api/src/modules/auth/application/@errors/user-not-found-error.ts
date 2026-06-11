import { AuthModuleApplicationError } from './app-error'

export class UserNotFoundError extends AuthModuleApplicationError {
	constructor() {
		super('User not found')
	}
}
