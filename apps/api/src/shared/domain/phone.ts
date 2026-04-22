import { failure, Result, success } from '../../result'
import { ValueObject } from '../../value-object'
import { InvalidValueError } from '../@errors/domain-errors/invalid-value-error'
import { PhoneLengthRule } from './rules/phone-length-rule'

//556293765723 -> 12 digitos(e 13 tambem porque em alguns estados os telefone ganharam um '9' a mais no começo)
export class Phone extends ValueObject<string> {
	static create(phone: string): Result<InvalidValueError, Phone> {
		const phoneLengthRule = new PhoneLengthRule()
		const cleaned = phone.replace(/\D/g, '')

		if (!phoneLengthRule.validate(cleaned)) {
			return failure(new InvalidValueError(phoneLengthRule.message))
		}

		return success(new Phone(cleaned))
	}
}
