import { describe, expect, it } from 'vitest'
import { CPF } from './cpf'

describe('CPF', () => {
	describe('create', () => {
		it('should create a valid CPF', () => {
			const result = CPF.create('145.382.206-20')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('14538220620')
			}
		})

		it('should create a valid CPF without formatting', () => {
			const result = CPF.create('14538220620')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('14538220620')
			}
		})

		it('should fail when CPF has less than 11 digits', () => {
			const result = CPF.create('123456789')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('CPF must have 11 digits')
			}
		})

		it('should fail when CPF has more than 11 digits', () => {
			const result = CPF.create('123456789012')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('CPF must have 11 digits')
			}
		})

		it('should fail when CPF has all equal digits (111.111.111-11)', () => {
			const result = CPF.create('111.111.111-11')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid CPF')
			}
		})

		it('should fail when CPF has all equal digits (222.222.222-22)', () => {
			const result = CPF.create('222.222.222-22')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid CPF')
			}
		})

		it('should fail when first check digit is invalid', () => {
			const result = CPF.create('145.382.206-30') // Último dígito errado

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid CPF')
			}
		})

		it('should fail when second check digit is invalid', () => {
			const result = CPF.create('145.382.206-21') // Último dígito errado

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid CPF')
			}
		})

		it('should accept multiple valid CPFs', () => {
			const validCPFs = [
				'145.382.206-20',
				'529.982.247-25',
				'123.456.789-09',
				'000.000.001-91',
			]

			validCPFs.forEach(cpf => {
				const result = CPF.create(cpf)
				expect(result.isSuccess()).toBe(true)
			})
		})

		it('should strip non-numeric characters', () => {
			const result = CPF.create('145.382.206-20')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).not.toContain('.')
				expect(result.value.value).not.toContain('-')
			}
		})
	})

	describe('value object equality', () => {
		it('should be equal when CPFs have the same value', () => {
			const cpf1Result = CPF.create('145.382.206-20')
			const cpf2Result = CPF.create('14538220620')

			expect(cpf1Result.isSuccess()).toBe(true)
			expect(cpf2Result.isSuccess()).toBe(true)

			if (cpf1Result.isSuccess() && cpf2Result.isSuccess()) {
				expect(cpf1Result.value.equals(cpf2Result.value)).toBe(true)
			}
		})

		it('should not be equal when CPFs have different values', () => {
			const cpf1Result = CPF.create('145.382.206-20')
			const cpf2Result = CPF.create('529.982.247-25')

			expect(cpf1Result.isSuccess()).toBe(true)
			expect(cpf2Result.isSuccess()).toBe(true)

			if (cpf1Result.isSuccess() && cpf2Result.isSuccess()) {
				expect(cpf1Result.value.equals(cpf2Result.value)).toBe(false)
			}
		})
	})
})
