import { describe, expect, it } from 'vitest'
import { Money } from './money'

describe('Money', () => {
	describe('create', () => {
		it('should create a valid money object', () => {
			const result = Money.create(1000, 'BRL')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.valueInCents).toBe(1000)
				expect(result.value.currency).toBe('BRL')
			}
		})

		it('should create another valid money object in USD', () => {
			const result = Money.create(2500, 'USD')

			expect(result.isSuccess()).toBe(true)
			if (result.isSuccess()) {
				expect(result.value.valueInCents).toBe(2500)
				expect(result.value.currency).toBe('USD')
			}
		})

		it('should fail when money amount is zero', () => {
			const result = Money.create(0, 'BRL')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Money amount must be greater than 0')
			}
		})

		it('should fail when money amount is negative', () => {
			const result = Money.create(-100, 'USD')

			expect(result.isFailure()).toBe(true)
			if (result.isFailure()) {
				expect(result.value.message).toBe('Money amount must be greater than 0')
			}
		})
	})

	describe('value object equality', () => {
		it('should be equal when money objects have the same value and currency', () => {
			const money1Result = Money.create(1000, 'BRL')
			const money2Result = Money.create(1000, 'BRL')

			expect(money1Result.isSuccess()).toBe(true)
			expect(money2Result.isSuccess()).toBe(true)

			if (money1Result.isSuccess() && money2Result.isSuccess()) {
				expect(money1Result.value.equals(money2Result.value)).toBe(true)
			}
		})

		it('should not be equal when money objects have different amounts', () => {
			const money1Result = Money.create(1000, 'BRL')
			const money2Result = Money.create(1500, 'BRL')

			expect(money1Result.isSuccess()).toBe(true)
			expect(money2Result.isSuccess()).toBe(true)

			if (money1Result.isSuccess() && money2Result.isSuccess()) {
				expect(money1Result.value.equals(money2Result.value)).toBe(false)
			}
		})

		it('should not be equal when money objects have different currencies', () => {
			const money1Result = Money.create(1000, 'BRL')
			const money2Result = Money.create(1000, 'USD')

			expect(money1Result.isSuccess()).toBe(true)
			expect(money2Result.isSuccess()).toBe(true)

			if (money1Result.isSuccess() && money2Result.isSuccess()) {
				expect(money1Result.value.equals(money2Result.value)).toBe(false)
			}
		})
	})
})
