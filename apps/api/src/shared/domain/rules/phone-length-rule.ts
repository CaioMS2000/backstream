import { Rule } from './rule'

export class PhoneLengthRule extends Rule<string> {
	message = 'Phone must have between 12 and 13 digits'
	validate(value: string): boolean {
		return value.length >= 12 && value.length <= 13
	}
}
