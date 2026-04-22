export abstract class Rule<T> {
	abstract message: string
	/*
	 * Validates the given value against the rule. Returns true if the value is valid, false otherwise.
	 */
	abstract validate(value: T): boolean
}
