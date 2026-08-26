import { UniqueId } from '@backstream/core'
import { describe, expect, it } from 'vitest'
import { Email } from '@/shared/domain'
import type { Role } from './role'
import { User } from './user'

function makeUser(roles: Role[]): User {
	const email = Email.create('user@example.com')
	if (email.isFailure()) throw new Error('email inválido no setup')

	return User.__create({
		id: UniqueId('user-1'),
		email: email.value,
		roles: [...roles],
		revokedAt: null,
	})
}

describe('User roles', () => {
	it('addRole adiciona uma role nova', () => {
		const user = makeUser(['donor'])
		user.addRole('streamer')
		expect(user.roles).toEqual(['donor', 'streamer'])
	})

	it('addRole é idempotente quando a role já existe', () => {
		const user = makeUser(['donor'])
		user.addRole('donor')
		expect(user.roles).toEqual(['donor'])
	})

	it('removeRole remove a role', () => {
		const user = makeUser(['donor', 'streamer'])
		user.removeRole('streamer')
		expect(user.roles).toEqual(['donor'])
	})

	it('removeRole é idempotente quando a role não existe', () => {
		const user = makeUser(['donor'])
		user.removeRole('streamer')
		expect(user.roles).toEqual(['donor'])
	})

	it('hasRole reflete o estado atual', () => {
		const user = makeUser(['donor'])
		expect(user.hasRole('donor')).toBe(true)
		expect(user.hasRole('streamer')).toBe(false)
	})
})
