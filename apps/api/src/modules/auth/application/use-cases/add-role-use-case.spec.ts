import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import { seedUser } from '../../test/seed-user'
import { RoleNotSelfAssignableError } from '../@errors/role-not-self-assignable-error'
import { UserNotFoundError } from '../@errors/user-not-found-error'
import { AddRoleUseCase } from './add-role-use-case'

describe('AddRoleUseCase', () => {
	let userRepo: InMemoryUserRepository
	let sut: AddRoleUseCase

	beforeEach(() => {
		initializeIdGenerator('v4')
		userRepo = new InMemoryUserRepository()
		sut = new AddRoleUseCase({ userRepository: userRepo })
	})

	afterEach(() => {
		__resetIdGeneratorForTests()
	})

	it('adiciona uma role nova e persiste', async () => {
		const user = await seedUser(userRepo, {
			email: 'a@example.com',
			roles: ['donor'],
		})

		const result = await sut.execute({ userId: user.id, role: 'streamer' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.roles).toEqual(['donor', 'streamer'])
		}
		expect(userRepo.items[0].roles).toContain('streamer')
	})

	it('é idempotente quando o usuário já tem a role', async () => {
		const user = await seedUser(userRepo, {
			email: 'a@example.com',
			roles: ['donor'],
		})

		const result = await sut.execute({ userId: user.id, role: 'donor' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.roles).toEqual(['donor'])
		}
	})

	it('falha com RoleNotSelfAssignableError ao tentar adicionar admin', async () => {
		const user = await seedUser(userRepo, {
			email: 'a@example.com',
			roles: ['donor'],
		})

		const result = await sut.execute({ userId: user.id, role: 'admin' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(RoleNotSelfAssignableError)
		}
	})

	it('falha com UserNotFoundError quando o usuário não existe', async () => {
		const result = await sut.execute({ userId: 'ghost', role: 'streamer' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(UserNotFoundError)
		}
	})
})
