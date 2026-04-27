import { StreamerModuleApplicationError } from './app-error'

export class SlugAlreadyTakenError extends StreamerModuleApplicationError {
	constructor() {
		super('Slug already taken by another streamer')
	}
}
