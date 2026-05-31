import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { AuthenticatedUser } from '../../public/types/authenticated-user'
import { FakeJwtService } from '../../test/fake-jwt-service'
import { FakeJwtTokenGenerator } from '../../test/fake-jwt-token-generator'
import { InMemoryRefreshTokenRepository } from '../../test/in-memory-refresh-token-repository'
import { TokenIssuer } from './token-issuer'

describe('TokenIssuer', () => {
	let refreshTokenRepo: InMemoryRefreshTokenRepository
	let sut: TokenIssuer

	const user: AuthenticatedUser = {
		userId: 'user-123',
		email: 'user@example.com',
		roles: ['donor'],
	}

	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')

		refreshTokenRepo = new InMemoryRefreshTokenRepository()

		sut = new TokenIssuer({
			jwtService: new FakeJwtService(),
			tokenGenerator: new FakeJwtTokenGenerator(),
			refreshTokenRepository: refreshTokenRepo,
		})
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	it('deve emitir access e refresh token e persistir o refresh token', async () => {
		const result = await sut.issue(user)

		expect(result.accessToken).toBe('fake-access-token')
		expect(result.refreshToken).toBe('fake-refresh-token')
		expect(refreshTokenRepo.items).toHaveLength(1)
		expect(refreshTokenRepo.items[0].userId).toBe(user.userId)
	})
})
