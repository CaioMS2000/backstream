import { StreamerModuleApplicationError } from './app-error'

export class NotAStreamerError extends StreamerModuleApplicationError {
	constructor() {
		super('User does not have streamer role')
	}
}
