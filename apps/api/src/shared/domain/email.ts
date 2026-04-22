import { InvalidValueError } from '@/@errors/invalid-value-error'
import { failure, Result, success } from '@backstream/core/result'
import { EmailContainsAtRule } from './rules/email-contains-at-rule'
import { EmailFormatRule } from './rules/email-format-rule'

export class Email {
	private constructor(public readonly value: string) {}

	static create(email: string): Result<InvalidValueError, Email> {
		const containsAtRule = new EmailContainsAtRule()
		const formatRule = new EmailFormatRule()

		if (!containsAtRule.validate(email)) {
			return failure(new InvalidValueError(containsAtRule.message))
		}

		if (!formatRule.validate(email)) {
			return failure(new InvalidValueError(formatRule.message))
		}

		return success(new Email(email))
	}
}
