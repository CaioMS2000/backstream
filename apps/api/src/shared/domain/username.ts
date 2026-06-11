import { failure, Result, success } from '@backstream/core'
import { InvalidValueError } from '@/@errors/invalid-value-error'

export class Username {
	public value: string
	static MIN_LENGTH = 3
	static MAX_LENGTH = 100

	private constructor(value: string) {
		this.value = value
	}

	static create(value: string): Result<InvalidValueError, Username> {
		const normalized = value.trim()

		if (
			normalized.length < Username.MIN_LENGTH ||
			normalized.length > Username.MAX_LENGTH
		) {
			return failure(
				new InvalidValueError(
					`Username must be between ${Username.MIN_LENGTH} and ${Username.MAX_LENGTH} characters long.`
				)
			)
		}

		if (!/^[a-zA-Z0-9_]+$/.test(normalized)) {
			return failure(
				new InvalidValueError(
					'Username can only contain letters, numbers, and underscores.'
				)
			)
		}

		return success(new Username(value))
	}

	static __create(value: string) {
		return new Username(value)
	}
}
