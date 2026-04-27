import { StreamerModuleApplicationError } from './app-error'

export class AlreadyOnboardedError extends StreamerModuleApplicationError {
	constructor() {
		super('Streamer profile already exists for this user')
	}
}
