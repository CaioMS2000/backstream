import { AuthModuleApplicationError } from './app-error'

export class CannotRemoveLastRoleError extends AuthModuleApplicationError {
	constructor() {
		super('Cannot remove the last role')
	}
}
