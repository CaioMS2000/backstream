import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import { seedUser } from '../../test/seed-user'
import { CannotRemoveLastRoleError } from '../@errors/cannot-remove-last-role-error'
import { RoleNotSelfAssignableError } from '../@errors/role-not-self-assignable-error'
import { UserNotFoundError } from '../@errors/user-not-found-error'
import { RemoveRoleUseCase } from './remove-role-use-case'

describe('RemoveRoleUseCase', () => {
	let userRepo: InMemoryUserRepository
	let sut: RemoveRoleUseCase

	beforeEach(() => {
		initializeIdGenerator('v4')
		userRepo = new InMemoryUserRepository()
		sut = new RemoveRoleUseCase({ userRepository: userRepo })
	})

	afterEach(() => {
		__resetIdGeneratorForTests()
	})

	it('remove uma role quando o usuário tem mais de uma', async () => {
		const user = await seedUser(userRepo, {
			email: 'a@example.com',
			roles: ['donor', 'streamer'],
		})

		const result = await sut.execute({ userId: user.id, role: 'streamer' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.roles).toEqual(['donor'])
		}
		expect(userRepo.items[0].roles).not.toContain('streamer')
	})

	it('é idempotente quando o usuário não tem a role', async () => {
		const user = await seedUser(userRepo, {
			email: 'a@example.com',
			roles: ['streamer'],
		})

		const result = await sut.execute({ userId: user.id, role: 'donor' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.roles).toEqual(['streamer'])
		}
	})

	it('bloqueia remover a última role com CannotRemoveLastRoleError', async () => {
		const user = await seedUser(userRepo, {
			email: 'a@example.com',
			roles: ['donor'],
		})

		const result = await sut.execute({ userId: user.id, role: 'donor' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(CannotRemoveLastRoleError)
		}
		expect(userRepo.items[0].roles).toEqual(['donor'])
	})

	it('falha com RoleNotSelfAssignableError ao tentar remover admin', async () => {
		const user = await seedUser(userRepo, {
			email: 'a@example.com',
			roles: ['admin', 'donor'],
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
