import { Rule } from './rule'

export class CPFLengthRule extends Rule<string> {
	message = 'CPF must have 11 digits'
	validate(value: string): boolean {
		return value.length === 11
	}
}
