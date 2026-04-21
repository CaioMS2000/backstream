import { describe, expect, it } from 'vitest'
import { UUIDV7Generator } from './uuid-v7-generator'

describe('UUIDV7Generator', () => {
	const generator = new UUIDV7Generator()

	describe('generate', () => {
		it('should generate a valid UUID v7', async () => {
			const id = await generator.generate()

			expect(id).toBeDefined()
			expect(id.toString()).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			)
		})

		it('should generate unique IDs', async () => {
			const id1 = await generator.generate()
			const id2 = await generator.generate()

			expect(id1.toString()).not.toBe(id2.toString())
		})

		it('should generate ID with prefix when provided', async () => {
			const prefix = 'booking'
			const id = await generator.generate(prefix)

			expect(id.toString()).toMatch(
				/^booking:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			)
			expect(id.toString().startsWith(`${prefix}:`)).toBe(true)
		})

		it('should generate ID without prefix when not provided', async () => {
			const id = await generator.generate()

			expect(id.toString()).not.toContain(':')
		})

		it('should generate different IDs with the same prefix', async () => {
			const prefix = 'listing'
			const id1 = await generator.generate(prefix)
			const id2 = await generator.generate(prefix)

			expect(id1.toString()).not.toBe(id2.toString())
			expect(id1.toString().startsWith(`${prefix}:`)).toBe(true)
			expect(id2.toString().startsWith(`${prefix}:`)).toBe(true)
		})
	})

	describe('temporal ordering', () => {
		it('should generate chronologically ordered IDs', async () => {
			const ids = await Promise.all(
				Array.from({ length: 5 }, () => generator.generate())
			)

			const sorted = [...ids].sort((a, b) => a.localeCompare(b))
			expect(ids).toEqual(sorted)
		})
	})
})
