import { describe, expect, it } from 'vitest'
import { Username } from './username'

describe('Username', () => {
	describe('create', () => {
		it('should create a valid username with letters, numbers and underscore', () => {
			const result = Username.create('joao_silva_99')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.value).toBe('joao_silva_99')
			}
		})

		it('should accept the minimum length (3 chars)', () => {
			const result = Username.create('abc')

			expect(result.isSuccess()).toBe(true)
		})

		it('should accept the maximum length (100 chars)', () => {
			const result = Username.create('a'.repeat(100))

			expect(result.isSuccess()).toBe(true)
		})

		it('should fail when shorter than 3 chars', () => {
			const result = Username.create('ab')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe(
					'Username must be between 3 and 100 characters long.'
				)
			}
		})

		it('should fail when longer than 100 chars', () => {
			const result = Username.create('a'.repeat(101))

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe(
					'Username must be between 3 and 100 characters long.'
				)
			}
		})

		it('should fail with invalid characters', () => {
			for (const invalid of [
				'joao.silva',
				'joao-silva',
				'joão',
				'joao silva',
			]) {
				const result = Username.create(invalid)

				expect(result.isFailure()).toBe(true)
				if (result.isFailure()) {
					expect(result.value.message).toBe(
						'Username can only contain letters, numbers, and underscores.'
					)
				}
			}
		})

		it('should validate length against the trimmed value', () => {
			const result = Username.create('  ab  ')

			expect(result.isFailure()).toBe(true)
		})
	})

	describe('createFromText', () => {
		it('should turn dots into underscores', () => {
			expect(Username.createFromText('joao.silva').value).toBe('joao_silva')
		})

		it('should lowercase and strip accents', () => {
			expect(Username.createFromText('João Silva').value).toBe('joao_silva')
		})

		it('should turn hyphens, plus and spaces into underscores', () => {
			expect(Username.createFromText('joao-silva+tag').value).toBe(
				'joao_silva_tag'
			)
		})

		it('should drop characters outside [a-z0-9_]', () => {
			expect(Username.createFromText('joão@#!silva').value).toBe('joaosilva')
		})

		it('should collapse repeated separators and trim underscores', () => {
			expect(Username.createFromText('  ..joao--silva..  ').value).toBe(
				'joao_silva'
			)
		})

		it('should keep underscores and digits', () => {
			expect(Username.createFromText('user_123').value).toBe('user_123')
		})
	})

	describe('equals', () => {
		it('should be equal when the values match', () => {
			expect(
				Username.__create('joao_silva').equals(Username.__create('joao_silva'))
			).toBe(true)
		})

		it('should not be equal when the values differ', () => {
			expect(
				Username.__create('joao_silva').equals(Username.__create('maria_silva'))
			).toBe(false)
		})
	})
})
