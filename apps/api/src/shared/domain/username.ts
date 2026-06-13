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

	/**
	 * Receives any string and normalizes it into a valid username body.
	 *
	 * Lowercases, strips accents, turns separators (space, `.`, `-`, `+`) into
	 * `_`, drops anything outside `[a-z0-9_]` and collapses/trims `_`.
	 *
	 * Example: "João.Silva+tag" => "joao_silva_tag"
	 *
	 * Does not guarantee `MIN_LENGTH`: callers that derive a username are
	 * expected to append a unique suffix, which also fixes short results.
	 *
	 * @param text {string}
	 */
	static createFromText(text: string): Username {
		const normalized = text
			.normalize('NFKD')
			.toLowerCase()
			.trim()
			.replace(/[\s.\-+]+/g, '_')
			.replace(/[^a-z0-9_]+/g, '')
			.replace(/_+/g, '_')
			.replace(/^_+|_+$/g, '')

		return new Username(normalized)
	}

	static __create(value: string) {
		return new Username(value)
	}
}
