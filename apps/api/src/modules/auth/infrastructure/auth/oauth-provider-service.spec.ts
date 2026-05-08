import { describe, expect, it, vi } from 'vitest'
import {
	type CreateAuthorizationURLResult,
	OAuthProviderAdapter,
} from './oauth-adapters/oauth-provider-adapter'
import { OAuthProviderService } from './oauth-provider-service'
import type { OAuthProvider, OAuthUserProfile } from './oauth-types'

class FakeAdapter extends OAuthProviderAdapter {
	readonly provider: OAuthProvider
	createAuthorizationURL = vi.fn<() => CreateAuthorizationURLResult>()
	validateCodeAndGetProfile =
		vi.fn<
			(code: string, codeVerifier: string | null) => Promise<OAuthUserProfile>
		>()

	constructor(provider: OAuthProvider) {
		super()
		this.provider = provider
	}
}

describe('OAuthProviderService', () => {
	it('despacha createAuthorizationURL para o adapter do provider', () => {
		const googleAdapter = new FakeAdapter('google')
		const expected: CreateAuthorizationURLResult = {
			url: new URL('https://accounts.google.com/o/oauth2/v2/auth?x=1'),
			state: 'state-1',
			codeVerifier: 'verifier-1',
		}
		googleAdapter.createAuthorizationURL.mockReturnValue(expected)

		const sut = new OAuthProviderService([googleAdapter])
		const result = sut.createAuthorizationURL('google')

		expect(result).toEqual(expected)
		expect(googleAdapter.createAuthorizationURL).toHaveBeenCalledTimes(1)
	})

	it('despacha validateCodeAndGetProfile para o adapter do provider', async () => {
		const googleAdapter = new FakeAdapter('google')
		const profile: OAuthUserProfile = {
			providerAccountId: 'sub-123',
			email: 'user@example.com',
			name: 'User',
		}
		googleAdapter.validateCodeAndGetProfile.mockResolvedValue(profile)

		const sut = new OAuthProviderService([googleAdapter])
		const result = await sut.validateCodeAndGetProfile(
			'google',
			'auth-code',
			'verifier-1'
		)

		expect(result).toEqual(profile)
		expect(googleAdapter.validateCodeAndGetProfile).toHaveBeenCalledWith(
			'auth-code',
			'verifier-1'
		)
	})

	it('lança erro quando o provider não tem adapter registrado', () => {
		const sut = new OAuthProviderService([])

		expect(() => sut.createAuthorizationURL('google')).toThrow(
			/No OAuth adapter registered for provider "google"/
		)
	})
})
