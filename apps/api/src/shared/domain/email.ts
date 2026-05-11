import { InvalidValueError } from '@/@errors/invalid-value-error'
import { failure, Result, success } from '@backstream/core/result'
import { EmailContainsAtRule } from './rules/email-contains-at-rule'
import { EmailFormatRule } from './rules/email-format-rule'

export class Email {
	private constructor(public readonly value: string) {}

	static normalize(raw: string): string {
		return raw.trim().toLowerCase()
	}

	static create(email: string): Result<InvalidValueError, Email> {
		const normalized = Email.normalize(email)
		const containsAtRule = new EmailContainsAtRule()
		const formatRule = new EmailFormatRule()

		if (!containsAtRule.validate(normalized)) {
			return failure(new InvalidValueError(containsAtRule.message))
		}

		if (!formatRule.validate(normalized)) {
			return failure(new InvalidValueError(formatRule.message))
		}

		return success(new Email(normalized))
	}

	equals(other: Email): boolean {
		return this.value === other.value
	}
}
