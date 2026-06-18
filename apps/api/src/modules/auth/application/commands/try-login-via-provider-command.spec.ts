import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
import { seedUser } from '../../test/seed-user'
import { TryLoginViaProviderCommandImpl } from './try-login-via-provider-command'

describe('TryLoginViaProviderCommand', () => {
	let userRepo: InMemoryUserRepository
	let oauthAccountRepo: InMemoryOAuthAccountRepository
	let sut: TryLoginViaProviderCommandImpl

	const baseInput = {
		provider: 'google',
		providerAccountId: 'google-123',
		email: 'user@example.com',
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		userRepo = new InMemoryUserRepository()
		oauthAccountRepo = new InMemoryOAuthAccountRepository()

		sut = new TryLoginViaProviderCommandImpl({
			userRepository: userRepo,
			oauthAccountRepository: oauthAccountRepo,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('deve retornar o usuário com isExistingLink=true quando o provider já está vinculado', async () => {
		const user = await seedUser(userRepo, {
			email: baseInput.email,
			roles: ['donor'],
		})
		await oauthAccountRepo.insert({
			userId: user.id,
			provider: baseInput.provider,
			providerAccountId: baseInput.providerAccountId,
		})

		const result = await sut.execute(baseInput)

		expect(result).not.toBeNull()
		expect(result?.isExistingLink).toBe(true)
		expect(result?.user.userId).toBe(user.id)
		expect(result?.user.email).toBe(baseInput.email)

		// read-only: não cria nem altera vínculos
		expect(oauthAccountRepo.items).toHaveLength(1)
	})

	it('deve retornar o usuário com isExistingLink=false quando existe por e-mail mas sem vínculo', async () => {
		const user = await seedUser(userRepo, {
			email: baseInput.email,
			roles: ['streamer'],
		})

		const result = await sut.execute(baseInput)

		expect(result).not.toBeNull()
		expect(result?.isExistingLink).toBe(false)
		expect(result?.user.userId).toBe(user.id)
		expect(result?.user.roles).toEqual(['streamer'])

		// read-only: o vínculo NÃO é criado aqui (responsabilidade do orquestrador)
		expect(oauthAccountRepo.items).toHaveLength(0)
	})

	it('deve retornar null quando não existe usuário por vínculo nem por e-mail', async () => {
		const result = await sut.execute(baseInput)

		expect(result).toBeNull()
		expect(userRepo.items).toHaveLength(0)
		expect(oauthAccountRepo.items).toHaveLength(0)
	})
})
