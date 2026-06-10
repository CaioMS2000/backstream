import { failure, Result, success } from '@backstream/core/result'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { Currency } from './currency'
import { MinMoneyAmountRule } from './rules/no-negative-money-amount'

export type MoneyProps = {
	valueInCents: number
	currency: Currency
}

export class Money {
	private constructor(private readonly value: MoneyProps) {}

	static create(
		valueInCents: number,
		currency: Currency
	): Result<InvalidValueError, Money> {
		const moneyAmountRule = new MinMoneyAmountRule()
		if (!moneyAmountRule.validate(valueInCents)) {
			return failure(new InvalidValueError(moneyAmountRule.message))
		}

		return success(new Money({ valueInCents, currency }))
	}

	get valueInCents(): number {
		return this.value.valueInCents
	}

	get currency(): Currency {
		return this.value.currency
	}

	equals(other: Money): boolean {
		return (
			this.value.valueInCents === other.value.valueInCents &&
			this.value.currency === other.value.currency
		)
	}
}
