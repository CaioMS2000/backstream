import { Rule } from './rule'

export class EmailContainsAtRule extends Rule<string> {
	message = 'Invalid email'
	validate(value: string): boolean {
		return value.includes('@')
	}
}
