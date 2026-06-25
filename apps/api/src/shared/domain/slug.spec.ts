import { expect, test } from 'vitest'
import { Slug } from './slug'

test('it should be able to create a new slug from text', () => {
	const slug = Slug.createFromText('Example question title')

	expect(slug.value).toBe('example-question-title')
})

test('it should consider two slugs with the same value equal', () => {
	expect(Slug.create('caio').equals(Slug.create('caio'))).toBe(true)
})

test('it should consider two slugs with different values not equal', () => {
	expect(Slug.create('caio').equals(Slug.create('outro'))).toBe(false)
})
