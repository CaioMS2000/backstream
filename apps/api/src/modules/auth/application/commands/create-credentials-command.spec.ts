import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { FakeHashGenerator } from '../../test/fake-hash-generator'
import { InMemoryPasswordCredentialRepository } from '../../test/in-memory-password-credential-repository'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import { EmailAlreadyRegisteredError } from '../@errors'
import { CreateCredentialsCommandImpl } from './create-credentials-command'

describe('CreateCredentialsCommand', () => {
	let userRepo: InMemoryUserRepository
	let passwordCredentialRepo: InMemoryPasswordCredentialRepository
	let sut: CreateCredentialsCommandImpl

	const baseInput = {
		email: 'caio@example.com',
		password: 'secret-password',
		role: 'donor' as const,
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		userRepo = new InMemoryUserRepository()
		passwordCredentialRepo = new InMemoryPasswordCredentialRepository()

		sut = new CreateCredentialsCommandImpl({
			userRepository: userRepo,
			passwordCredentialRepository: passwordCredentialRepo,
			hashGenerator: new FakeHashGenerator(),
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('deve criar usuário e credencial de senha, retornando o usuário', async () => {
		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.user.email).toBe(baseInput.email)
			expect(result.value.user.roles).toEqual([baseInput.role])
			expect(result.value.user.userId).toBe(userRepo.items[0].id)
		}

		expect(userRepo.items).toHaveLength(1)
		expect(passwordCredentialRepo.items).toHaveLength(1)
		expect(passwordCredentialRepo.items[0].userId).toBe(userRepo.items[0].id)
	})

	it('deve falhar com EmailAlreadyRegisteredError quando o e-mail já existe', async () => {
		await sut.execute(baseInput)

		const result = await sut.execute(baseInput)

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(EmailAlreadyRegisteredError)
		}
		expect(userRepo.items).toHaveLength(1)
		expect(passwordCredentialRepo.items).toHaveLength(1)
	})

	it('deve falhar com InvalidValueError quando o e-mail é inválido', async () => {
		const result = await sut.execute({ ...baseInput, email: 'not-an-email' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidValueError)
		}
		expect(userRepo.items).toHaveLength(0)
		expect(passwordCredentialRepo.items).toHaveLength(0)
	})
})
