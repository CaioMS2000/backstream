import {
	type CreateAuthorizationURLResult,
	OAuthProviderAdapter,
} from '@/modules/auth/infrastructure/auth/oauth-adapters/oauth-provider-adapter'
import type {
	OAuthProvider,
	OAuthUserProfile,
} from '@/modules/auth/infrastructure/auth/oauth-types'

export class FakeOAuthProviderAdapter extends OAuthProviderAdapter {
	readonly provider: OAuthProvider

	constructor(
		provider: OAuthProvider,
		private readonly mockProfile: OAuthUserProfile,
		private readonly mockAuthorizationResult?: CreateAuthorizationURLResult
	) {
		super()
		this.provider = provider
	}

	createAuthorizationURL(): CreateAuthorizationURLResult {
		return (
			this.mockAuthorizationResult ?? {
				url: new URL('https://accounts.google.com/o/oauth2/v2/auth?fake=1'),
				state: 'fake-state',
				codeVerifier: 'fake-verifier',
			}
		)
	}

	async validateCodeAndGetProfile(): Promise<OAuthUserProfile> {
		return this.mockProfile
	}
}
