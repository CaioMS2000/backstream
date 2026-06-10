import { failure, Result, success } from '@backstream/core/result'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { CPFLengthRule } from './rules/cpf-length-rule'

export class CPF {
	private constructor(public readonly value: string) {}

	static create(cpf: string): Result<InvalidValueError, CPF> {
		const cpfLengthRule = new CPFLengthRule()
		const cleaned = cpf.replace(/\D/g, '')

		if (!cpfLengthRule.validate(cleaned)) {
			return failure(new InvalidValueError(cpfLengthRule.message))
		}

		if (!CPF.isValidChecksum(cleaned)) {
			return failure(new InvalidValueError('Invalid CPF'))
		}

		return success(new CPF(cleaned))
	}

	equals(other: CPF): boolean {
		return this.value === other.value
	}

	private static isValidChecksum(cpf: string): boolean {
		// Verifica CPFs inválidos conhecidos (todos dígitos iguais)
		if (/^(\d)\1{10}$/.test(cpf)) {
			return false
		}

		// Validação do primeiro dígito verificador
		let sum = 0
		for (let i = 0; i < 9; i++) {
			sum += parseInt(cpf.charAt(i), 10) * (10 - i)
		}

		let remainder = sum % 11
		const firstDigit = remainder < 2 ? 0 : 11 - remainder

		if (firstDigit !== parseInt(cpf.charAt(9), 10)) {
			return false
		}

		// Validação do segundo dígito verificador
		sum = 0
		for (let i = 0; i < 10; i++) {
			sum += parseInt(cpf.charAt(i), 10) * (11 - i)
		}

		remainder = sum % 11
		const secondDigit = remainder < 2 ? 0 : 11 - remainder

		if (secondDigit !== parseInt(cpf.charAt(10), 10)) {
			return false
		}

		return true
	}
}
