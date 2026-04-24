import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { JwtService } from '../jwt/jwt-service'
import { JwtTokenGenerator } from '../jwt/jwt-token-generator'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import { InMemoryOAuthAccountRepository } from '../../test/in-memory-oauth-account-repository'
import { InMemoryRefreshTokenRepository } from '../../test/in-memory-refresh-token-repository'
import { User } from '../../domain/user'
import { Email } from '@/shared/domain'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { SocialLoginUseCase } from './social-login-use-case'
import type { JWTPayload } from 'jose'

class FakeJwtService extends JwtService {
	async sign(): Promise<string> {
		return 'fake-access-token'
	}
	async verify<T extends JWTPayload = JWTPayload>(): Promise<T> {
		return {} as T
	}
	async decode<T extends JWTPayload = JWTPayload>(): Promise<T> {
		return {} as T
	}
	async signAccessToken(): Promise<string> {
		return 'fake-access-token'
	}
	async verifyAccessToken(): Promise<JWTPayload | null> {
		return null
	}
}

class FakeJwtTokenGenerator extends JwtTokenGenerator {
	async generateRefreshToken(): Promise<string> {
		return 'fake-refresh-token'
	}
	async hashRefreshToken(): Promise<string> {
		return 'fake-refresh-token-hash'
	}
}

describe('SocialLoginUseCase', () => {
	let userRepo: InMemoryUserRepository
	let oauthAccountRepo: InMemoryOAuthAccountRepository
	let refreshTokenRepo: InMemoryRefreshTokenRepository
	let sut: SocialLoginUseCase

	const baseInput = {
		provider: 'google',
		providerAccountId: 'google-123',
		email: 'user@example.com',
		name: 'Test User',
		role: 'viewer' as const,
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		userRepo = new InMemoryUserRepository()
		oauthAccountRepo = new InMemoryOAuthAccountRepository()
		refreshTokenRepo = new InMemoryRefreshTokenRepository()

		sut = new SocialLoginUseCase({
			userRepository: userRepo,
			oauthAccountRepository: oauthAccountRepo,
			refreshTokenRepository: refreshTokenRepo,
			jwtService: new FakeJwtService(),
			tokenGenerator: new FakeJwtTokenGenerator(),
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	async function seedUser(opts: {
		email: string
		name?: string
		roles: ('streamer' | 'viewer')[]
	}): Promise<User> {
		const emailResult = Email.create(opts.email)
		if (emailResult.isFailure()) {
			throw new Error(`seed inválido: ${emailResult.value.message}`)
		}
		const user = await User.create({
			email: emailResult.value,
			name: opts.name ?? 'Seeded User',
			phone: null,
			roles: opts.roles,
			now: new Date(),
		})
		userRepo.items.push(user)
		return user
	}

	it('deve logar usuário existente quando o provider já está vinculado', async () => {
		const user = await seedUser({
			email: baseInput.email,
			roles: ['viewer'],
		})
		await oauthAccountRepo.save({
			userId: user.id,
			provider: baseInput.provider,
			providerAccountId: baseInput.providerAccountId,
		})

		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.id).toBe(user.id)
			expect(result.value.accessToken).toBe('fake-access-token')
			expect(result.value.refreshToken).toBe('fake-refresh-token')
		}

		expect(oauthAccountRepo.items).toHaveLength(1)
		expect(userRepo.items).toHaveLength(1)
		expect(refreshTokenRepo.items).toHaveLength(1)
	})

	it('deve auto-vincular e logar quando já existe usuário com mesmo e-mail', async () => {
		const user = await seedUser({
			email: baseInput.email,
			roles: ['streamer'],
		})

		const result = await sut.execute(baseInput)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.id).toBe(user.id)
			expect(result.value.user.roles).toEqual(['streamer'])
		}

		expect(oauthAccountRepo.items).toHaveLength(1)
		expect(oauthAccountRepo.items[0]).toMatchObject({
			userId: user.id,
			provider: baseInput.provider,
			providerAccountId: baseInput.providerAccountId,
		})
		expect(userRepo.items).toHaveLength(1)
	})

	it('deve criar novo usuário (viewer) quando não existe', async () => {
		const result = await sut.execute({ ...baseInput, role: 'viewer' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(true)
			expect(result.value.user.roles).toEqual(['viewer'])
			expect(result.value.user.email).toBe(baseInput.email)
		}

		expect(userRepo.items).toHaveLength(1)
		expect(userRepo.items[0].roles).toEqual(['viewer'])
		expect(oauthAccountRepo.items).toHaveLength(1)
		expect(refreshTokenRepo.items).toHaveLength(1)
	})

	it('deve criar novo usuário (streamer) quando não existe', async () => {
		const result = await sut.execute({ ...baseInput, role: 'streamer' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(true)
			expect(result.value.user.roles).toEqual(['streamer'])
		}

		expect(userRepo.items[0].roles).toEqual(['streamer'])
	})

	it('deve retornar InvalidValueError quando o e-mail é inválido', async () => {
		const result = await sut.execute({ ...baseInput, email: 'not-an-email' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidValueError)
		}

		expect(userRepo.items).toHaveLength(0)
		expect(oauthAccountRepo.items).toHaveLength(0)
		expect(refreshTokenRepo.items).toHaveLength(0)
	})
})
