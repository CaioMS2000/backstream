import { type CryptoKey, generateKeyPair, SignJWT } from 'jose'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

let signingPrivateKey: CryptoKey
let signingPublicKey: CryptoKey
let foreignPrivateKey: CryptoKey

vi.mock('./keys', () => ({
	getPrivateKey: () => Promise.resolve(signingPrivateKey),
	getPublicKey: () => Promise.resolve(signingPublicKey),
}))

const { TokenService } = await import('./token-service')

describe('TokenService', () => {
	const sut = new TokenService()

	beforeAll(async () => {
		const main = await generateKeyPair('RS256')
		const foreign = await generateKeyPair('RS256')
		signingPrivateKey = main.privateKey
		signingPublicKey = main.publicKey
		foreignPrivateKey = foreign.privateKey
	})

	afterAll(() => {
		vi.useRealTimers()
	})

	it('round-trip: payload assinado contém sub, email e roles[]', async () => {
		const token = await sut.signAccessToken({
			sub: 'user-123',
			email: 'caio@example.com',
			roles: ['admin', 'streamer'],
		})

		const payload = await sut.verifyAccessToken(token)

		expect(payload).not.toBeNull()
		expect(payload?.sub).toBe('user-123')
		expect(payload?.email).toBe('caio@example.com')
		expect(payload?.roles).toEqual(['admin', 'streamer'])
		expect(payload).not.toHaveProperty('name')
		expect(payload).not.toHaveProperty('role')
	})

	it('verifyAccessToken retorna null para token malformado', async () => {
		const result = await sut.verifyAccessToken('not.a.valid.jwt')
		expect(result).toBeNull()
	})

	it('verifyAccessToken retorna null para token expirado', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))

		const token = await sut.signAccessToken({
			sub: 'user-123',
			email: 'caio@example.com',
			roles: ['donor'],
		})

		vi.setSystemTime(new Date('2026-01-01T00:11:00Z'))

		const result = await sut.verifyAccessToken(token)
		expect(result).toBeNull()

		vi.useRealTimers()
	})

	it('verifyAccessToken retorna null para token assinado por chave estranha', async () => {
		const foreignToken = await new SignJWT({
			email: 'attacker@example.com',
			roles: ['admin'],
		})
			.setProtectedHeader({ alg: 'RS256', kid: 'default' })
			.setSubject('user-evil')
			.setIssuedAt()
			.setExpirationTime('10m')
			.sign(foreignPrivateKey)

		const result = await sut.verifyAccessToken(foreignToken)
		expect(result).toBeNull()
	})
})
