export abstract class ApplicationError extends Error {
	constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}

export abstract class DomainError extends Error {
	constructor(message?: string) {
		super(message)
		this.name = this.constructor.name
	}
}
