import { StreamerModuleApplicationError } from './app-error'

export class StreamerNotFoundError extends StreamerModuleApplicationError {
	constructor() {
		super('Streamer profile not found for this user')
	}
}
