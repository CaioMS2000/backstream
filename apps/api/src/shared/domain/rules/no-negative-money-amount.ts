import { Rule } from './rule'

export class MinMoneyAmountRule extends Rule<number> {
	message = 'Money amount must be greater than 0'
	validate(value: number): boolean {
		return value > 0
	}
}
