import { generateCodeVerifier, generateState, Google } from 'arctic'
import { decodeJwt } from 'jose'
import type { OAuthUserProfile } from '../oauth-types'
import {
	type CreateAuthorizationURLResult,
	OAuthProviderAdapter,
} from './oauth-provider-adapter'

export type GoogleOAuthAdapterConfig = {
	clientId: string
	clientSecret: string
	redirectUri: string
}

export class GoogleOAuthAdapter extends OAuthProviderAdapter {
	readonly provider = 'google' as const
	private google: Google

	constructor(config: GoogleOAuthAdapterConfig) {
		super()
		this.google = new Google(
			config.clientId,
			config.clientSecret,
			config.redirectUri
		)
	}

	createAuthorizationURL(): CreateAuthorizationURLResult {
		const state = generateState()
		const codeVerifier = generateCodeVerifier()
		const url = this.google.createAuthorizationURL(state, codeVerifier, [
			'openid',
			'profile',
			'email',
		])

		return { url, state, codeVerifier }
	}

	async validateCodeAndGetProfile(
		code: string,
		codeVerifier: string | null
	): Promise<OAuthUserProfile> {
		if (!codeVerifier) {
			throw new Error('Google OAuth requires a PKCE codeVerifier')
		}

		const tokens = await this.google.validateAuthorizationCode(
			code,
			codeVerifier
		)
		const claims = decodeJwt(tokens.idToken())

		return {
			providerAccountId: claims.sub!,
			email: claims.email as string,
			name: claims.name as string,
		}
	}
}
