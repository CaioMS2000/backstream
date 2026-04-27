import { StreamerModuleApplicationError } from './app-error'

export class UserNotFoundError extends StreamerModuleApplicationError {
	constructor() {
		super('User not found or revoked')
	}
}
