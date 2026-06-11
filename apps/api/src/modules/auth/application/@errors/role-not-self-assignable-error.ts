import { AuthModuleApplicationError } from './app-error'

export class RoleNotSelfAssignableError extends AuthModuleApplicationError {
	constructor() {
		super('Role cannot be self-managed')
	}
}
