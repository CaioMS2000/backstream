import { describe, expect, it } from 'vitest'
import { Phone } from './phone'

describe('Phone', () => {
	describe('create', () => {
		it('should create a valid phone with 12 digits', () => {
			const result = Phone.create('556293765723')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('556293765723')
			}
		})

		it('should create a valid phone with 13 digits', () => {
			const result = Phone.create('5562993765723')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('5562993765723')
			}
		})

		it('should create a valid phone with formatting (12 digits)', () => {
			const result = Phone.create('+55 (62) 9376-5723')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('556293765723')
			}
		})

		it('should create a valid phone with formatting (13 digits)', () => {
			const result = Phone.create('+55 (62) 99376-5723')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('5562993765723')
			}
		})

		it('should strip all non-numeric characters', () => {
			const result = Phone.create('+55 (62) 9-9376-5723')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('5562993765723')
				expect(result.value.value).not.toContain('+')
				expect(result.value.value).not.toContain('(')
				expect(result.value.value).not.toContain(')')
				expect(result.value.value).not.toContain('-')
				expect(result.value.value).not.toContain(' ')
			}
		})

		it('should fail when phone has less than 12 digits', () => {
			const result = Phone.create('5562937657')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe(
					'Phone must have between 12 and 13 digits'
				)
			}
		})

		it('should fail when phone has more than 13 digits', () => {
			const result = Phone.create('55629937657234')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe(
					'Phone must have between 12 and 13 digits'
				)
			}
		})

		it('should fail when phone has only 11 digits after cleaning', () => {
			const result = Phone.create('11987654321')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe(
					'Phone must have between 12 and 13 digits'
				)
			}
		})

		it('should accept different Brazilian states DDDs', () => {
			const validPhones = [
				'551199887766', // São Paulo
				'552133445566', // Rio de Janeiro
				'556232445566', // Goiás
				'558532998877', // Ceará
			]

			validPhones.forEach(phone => {
				const result = Phone.create(phone)
				expect(result.isSuccess()).toBe(true)
			})
		})
	})

	describe('value object equality', () => {
		it('should be equal when phones have the same value', () => {
			const phone1Result = Phone.create('556293765723')
			const phone2Result = Phone.create('+55 (62) 9376-5723')

			expect(phone1Result.isSuccess()).toBe(true)
			expect(phone2Result.isSuccess()).toBe(true)

			if (phone1Result.isSuccess() && phone2Result.isSuccess()) {
				expect(phone1Result.value.equals(phone2Result.value)).toBe(true)
			}
		})

		it('should not be equal when phones have different values', () => {
			const phone1Result = Phone.create('556293765723')
			const phone2Result = Phone.create('556298765432')

			expect(phone1Result.isSuccess()).toBe(true)
			expect(phone2Result.isSuccess()).toBe(true)

			if (phone1Result.isSuccess() && phone2Result.isSuccess()) {
				expect(phone1Result.value.equals(phone2Result.value)).toBe(false)
			}
		})
	})
})
