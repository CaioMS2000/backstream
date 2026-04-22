import { describe, expect, it } from 'vitest'
import { Email } from './email'

describe('Email', () => {
	describe('create', () => {
		it('should create a valid email', () => {
			const result = Email.create('joao@example.com')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('joao@example.com')
			}
		})

		it('should create a valid email with subdomain', () => {
			const result = Email.create('user@mail.example.com')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('user@mail.example.com')
			}
		})

		it('should create a valid email with plus sign', () => {
			const result = Email.create('user+tag@example.com')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('user+tag@example.com')
			}
		})

		it('should create a valid email with numbers', () => {
			const result = Email.create('user123@example.com')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('user123@example.com')
			}
		})

		it('should fail when email does not contain @', () => {
			const result = Email.create('invalid-email.com')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid email')
			}
		})

		it('should fail when email does not contain domain', () => {
			const result = Email.create('user@')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid email format')
			}
		})

		it('should fail when email does not contain local part', () => {
			const result = Email.create('@example.com')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid email format')
			}
		})

		it('should fail when email contains spaces', () => {
			const result = Email.create('user name@example.com')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid email format')
			}
		})

		it('should fail when email does not have TLD', () => {
			const result = Email.create('user@example')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid email format')
			}
		})

		it('should fail when email has multiple @ symbols', () => {
			const result = Email.create('user@@example.com')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Invalid email format')
			}
		})
	})

	describe('value object equality', () => {
		it('should be equal when emails have the same value', () => {
			const email1Result = Email.create('joao@example.com')
			const email2Result = Email.create('joao@example.com')

			expect(email1Result.isSuccess()).toBe(true)
			expect(email2Result.isSuccess()).toBe(true)

			if (email1Result.isSuccess() && email2Result.isSuccess()) {
				expect(email1Result.value.equals(email2Result.value)).toBe(true)
			}
		})

		it('should not be equal when emails have different values', () => {
			const email1Result = Email.create('joao@example.com')
			const email2Result = Email.create('maria@example.com')

			expect(email1Result.isSuccess()).toBe(true)
			expect(email2Result.isSuccess()).toBe(true)

			if (email1Result.isSuccess() && email2Result.isSuccess()) {
				expect(email1Result.value.equals(email2Result.value)).toBe(false)
			}
		})
	})
})
