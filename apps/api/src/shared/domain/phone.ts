import { failure, Result, success } from '@backstream/core/result'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { PhoneLengthRule } from './rules/phone-length-rule'

//556293765723 -> 12 digitos(e 13 tambem porque em alguns estados os telefone ganharam um '9' a mais no começo)
export class Phone {
	protected constructor(private readonly _value: string) {}

	get value(): string {
		return this._value
	}

	static create(phone: string): Result<InvalidValueError, Phone> {
		const phoneLengthRule = new PhoneLengthRule()
		const cleaned = phone.replace(/\D/g, '')

		if (!phoneLengthRule.validate(cleaned)) {
			return failure(new InvalidValueError(phoneLengthRule.message))
		}

		return success(new Phone(cleaned))
	}

	static createOptional(
		raw: string | null
	): Result<InvalidValueError, Phone | null> {
		if (!raw) return success(null)
		return Phone.create(raw)
	}

	equals(other: Phone): boolean {
		return this.value === other.value
	}

	static __create(value: string): Phone {
		return new Phone(value)
	}
}
