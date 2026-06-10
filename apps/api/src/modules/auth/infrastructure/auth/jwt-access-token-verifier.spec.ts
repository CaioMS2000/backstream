import { describe, expect, it, vi } from 'vitest'
import type { JwtService } from '@/modules/auth/application/jwt'
import { JwtAccessTokenVerifier } from './jwt-access-token-verifier'

function makeJwtService(
	verifyAccessToken: JwtService['verifyAccessToken']
): JwtService {
	return {
		sign: vi.fn(),
		verify: vi.fn(),
		decode: vi.fn(),
		signAccessToken: vi.fn(),
		verifyAccessToken,
	}
}

describe('JwtAccessTokenVerifier', () => {
	it('retorna null quando verifyAccessToken retorna null', async () => {
		const jwtService = makeJwtService(vi.fn().mockResolvedValue(null))
		const sut = new JwtAccessTokenVerifier(jwtService)

		const result = await sut.verify('token')

		expect(result).toBeNull()
		expect(jwtService.verifyAccessToken).toHaveBeenCalledWith('token')
	})

	it('retorna null quando sub não é string', async () => {
		const jwtService = makeJwtService(
			vi.fn().mockResolvedValue({
				sub: 123,
				email: 'user@example.com',
				roles: ['donor'],
			})
		)
		const sut = new JwtAccessTokenVerifier(jwtService)

		expect(await sut.verify('token')).toBeNull()
	})

	it('retorna null quando email não é string', async () => {
		const jwtService = makeJwtService(
			vi.fn().mockResolvedValue({
				sub: 'user-123',
				email: null,
				roles: ['donor'],
			})
		)
		const sut = new JwtAccessTokenVerifier(jwtService)

		expect(await sut.verify('token')).toBeNull()
	})

	it('retorna null quando roles não é array', async () => {
		const jwtService = makeJwtService(
			vi.fn().mockResolvedValue({
				sub: 'user-123',
				email: 'user@example.com',
				roles: 'donor',
			})
		)
		const sut = new JwtAccessTokenVerifier(jwtService)

		expect(await sut.verify('token')).toBeNull()
	})

	it('retorna AuthenticatedUser quando claims são válidas', async () => {
		const jwtService = makeJwtService(
			vi.fn().mockResolvedValue({
				sub: 'user-123',
				email: 'user@example.com',
				roles: ['admin', 'streamer'],
			})
		)
		const sut = new JwtAccessTokenVerifier(jwtService)

		expect(await sut.verify('token')).toEqual({
			userId: 'user-123',
			email: 'user@example.com',
			roles: ['admin', 'streamer'],
		})
	})
})
