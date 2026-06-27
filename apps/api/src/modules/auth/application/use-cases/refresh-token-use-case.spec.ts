import { UniqueId } from '@backstream/core/unique-id'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Email } from '@/shared/domain'
import {
	__resetClockForTests,
	initializeClock,
	now,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { RefreshToken } from '../../domain/refresh-token'
import { User } from '../../domain/user'
import { FakeJwtService } from '../../test/fake-jwt-service'
import { FakeJwtTokenGenerator } from '../../test/fake-jwt-token-generator'
import { InMemoryRefreshTokenRepository } from '../../test/in-memory-refresh-token-repository'
import { InMemoryUserRepository } from '../../test/in-memory-user-repository'
import { InvalidRefreshTokenError } from '../@errors/invalid-refresh-token-error'
import { TokenReplayDetectedError } from '../@errors/token-replay-detected-error'
import { TokenIssuer } from '../services/token-issuer'
import { RefreshTokenUseCase } from './refresh-token-use-case'

// O FakeJwtTokenGenerator ignora a entrada e sempre devolve este hash,
// então o token guardado precisa ter este `value` pra ser encontrado.
const TOKEN_HASH = 'fake-refresh-token-hash'

describe('RefreshTokenUseCase', () => {
	let refreshTokenRepo: InMemoryRefreshTokenRepository
	let userRepo: InMemoryUserRepository
	let sut: RefreshTokenUseCase
	let user: User

	function makeSut(
		repo: InMemoryRefreshTokenRepository = refreshTokenRepo
	): RefreshTokenUseCase {
		return new RefreshTokenUseCase({
			refreshTokenRepository: repo,
			userRepository: userRepo,
			tokenGenerator: new FakeJwtTokenGenerator(),
			tokenIssuer: new TokenIssuer({
				jwtService: new FakeJwtService(),
				tokenGenerator: new FakeJwtTokenGenerator(),
				refreshTokenRepository: repo,
			}),
		})
	}

	function storeToken(
		overrides: Partial<{
			value: string
			expiresAt: Date
			revokedAt: Date | null
			usedAt: Date | null
		}> = {}
	): RefreshToken {
		const token = RefreshToken.__create({
			id: UniqueId(`rt-${refreshTokenRepo.items.length + 1}`),
			userId: user.id,
			value: overrides.value ?? TOKEN_HASH,
			expiresAt: overrides.expiresAt ?? new Date(now().getTime() + 3_600_000),
			revokedAt: overrides.revokedAt ?? null,
			usedAt: overrides.usedAt ?? null,
		})
		refreshTokenRepo.items.push(token)
		return token
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		refreshTokenRepo = new InMemoryRefreshTokenRepository()
		userRepo = new InMemoryUserRepository()

		const email = Email.create('user@example.com')
		if (email.isFailure()) throw new Error('email inválido no setup')

		user = User.__create({
			id: UniqueId('user-1'),
			email: email.value,
			roles: ['donor'],
			revokedAt: null,
			createdAt: new Date(),
		})
		userRepo.items.push(user)

		sut = makeSut()
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('rotaciona o token no caminho feliz', async () => {
		storeToken()

		const result = await sut.execute({ refreshToken: 'qualquer' })

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.accessToken).toBe('fake-access-token')
			expect(result.value.refreshToken).toBe('fake-refresh-token')
		}
	})

	it('falha com Invalid quando o token não existe', async () => {
		const result = await sut.execute({ refreshToken: 'qualquer' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
		}
	})

	it('detecta replay de token já usado e revoga todas as sessões do usuário', async () => {
		storeToken({ usedAt: new Date(now().getTime() - 1000) })
		storeToken({ value: 'sessao-paralela' })

		const result = await sut.execute({ refreshToken: 'qualquer' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(TokenReplayDetectedError)
		}
		// revokeAllForUser cascateou: a sessão paralela também foi revogada
		expect(refreshTokenRepo.items.every(t => t.revokedAt !== null)).toBe(true)
	})

	it('rejeita token revogado (logout) sem derrubar as outras sessões', async () => {
		storeToken({ revokedAt: new Date(now().getTime() - 1000) })
		storeToken({ value: 'sessao-ativa' })

		const result = await sut.execute({ refreshToken: 'qualquer' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
		}
		const stillActive = refreshTokenRepo.items.find(
			t => t.value === 'sessao-ativa'
		)
		expect(stillActive?.revokedAt).toBeNull()
	})

	it('rejeita token expirado', async () => {
		storeToken({ expiresAt: new Date(now().getTime() - 1000) })

		const result = await sut.execute({ refreshToken: 'qualquer' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
		}
	})

	it('trata corrida concorrente (markUsed perde) como replay', async () => {
		class RaceLosingRepo extends InMemoryRefreshTokenRepository {
			async markUsed(): Promise<boolean> {
				return false
			}
		}
		refreshTokenRepo = new RaceLosingRepo()
		storeToken()
		sut = makeSut()

		const result = await sut.execute({ refreshToken: 'qualquer' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(TokenReplayDetectedError)
		}
	})

	it('rejeita quando o usuário não existe mais', async () => {
		userRepo.items = []
		storeToken()

		const result = await sut.execute({ refreshToken: 'qualquer' })

		expect(result.isFailure()).toBe(true)
		if (result.isFailure()) {
			expect(result.value).toBeInstanceOf(InvalidRefreshTokenError)
		}
	})
})
