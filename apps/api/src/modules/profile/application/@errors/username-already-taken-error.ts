import { ProfileModuleApplicationError } from './app-error'

export class UsernameAlreadyTakenError extends ProfileModuleApplicationError {
	constructor() {
		super('Username already taken')
	}
}
