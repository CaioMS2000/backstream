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
import { InMemoryOAuthAccountRepository } from '../../test/in-memory-oauth-account-repository'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import { CreateCredentialsFromProviderCommandImpl } from './create-credentials-from-provider-command'

describe('CreateCredentialsFromProviderCommand', () => {
	let userRepo: InMemoryUserRepository
	let oauthAccountRepo: InMemoryOAuthAccountRepository
	let sut: CreateCredentialsFromProviderCommandImpl

	const baseInput = {
		provider: 'google',
		providerAccountId: 'google-123',
		email: 'user@example.com',
		role: 'donor' as const,
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		userRepo = new InMemoryUserRepository()
		oauthAccountRepo = new InMemoryOAuthAccountRepository()

		sut = new CreateCredentialsFromProviderCommandImpl({
			userRepository: userRepo,
			oauthAccountRepository: oauthAccountRepo,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('deve criar usuário e vínculo oauth, retornando o usuário', async () => {
		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.user.email).toBe(baseInput.email)
			expect(result.value.user.roles).toEqual([baseInput.role])
			expect(result.value.user.userId).toBe(userRepo.items[0].id)
		}

		expect(userRepo.items).toHaveLength(1)
		expect(oauthAccountRepo.items).toHaveLength(1)
		expect(oauthAccountRepo.items[0]).toMatchObject({
			userId: userRepo.items[0].id,
			provider: baseInput.provider,
			providerAccountId: baseInput.providerAccountId,
		})
	})

	it('deve falhar com InvalidValueError quando o e-mail é inválido', async () => {
		const result = await sut.execute({ ...baseInput, email: 'not-an-email' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidValueError)
		}
		expect(userRepo.items).toHaveLength(0)
		expect(oauthAccountRepo.items).toHaveLength(0)
	})
})
