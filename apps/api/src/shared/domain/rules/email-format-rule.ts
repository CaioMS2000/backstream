import { Rule } from './rule'

export class EmailFormatRule extends Rule<string> {
	message = 'Invalid email format'
	validate(value: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
	}
}
