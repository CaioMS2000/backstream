export abstract class StreamerModuleApplicationError extends Error {
	constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}
