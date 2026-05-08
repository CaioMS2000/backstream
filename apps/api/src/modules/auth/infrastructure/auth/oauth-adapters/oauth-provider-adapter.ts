import type { OAuthProvider, OAuthUserProfile } from '../oauth-types'

export type CreateAuthorizationURLResult = {
	url: URL
	state: string
	codeVerifier: string | null
}

export abstract class OAuthProviderAdapter {
	abstract readonly provider: OAuthProvider
	abstract createAuthorizationURL(): CreateAuthorizationURLResult
	abstract validateCodeAndGetProfile(
		code: string,
		codeVerifier: string | null
	): Promise<OAuthUserProfile>
}
