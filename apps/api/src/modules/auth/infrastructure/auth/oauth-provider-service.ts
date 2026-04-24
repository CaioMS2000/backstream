import { Google, generateCodeVerifier, generateState } from 'arctic'
import { decodeJwt } from 'jose'

export const OAuthProvider = ['google' /* 'facebook' */] as const
export type OAuthProvider = (typeof OAuthProvider)[number]

export type OAuthUserProfile = {
	providerAccountId: string
	email: string
	name: string
}

type OAuthProviderServiceConfig = {
	googleClientId: string
	googleClientSecret: string
	googleRedirectUri: string
}

export class OAuthProviderService {
	private google: Google

	constructor(config: OAuthProviderServiceConfig) {
		this.google = new Google(
			config.googleClientId,
			config.googleClientSecret,
			config.googleRedirectUri
		)
	}

	createAuthorizationURL(_provider: OAuthProvider): {
		url: URL
		state: string
		codeVerifier: string
	} {
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
		_provider: OAuthProvider,
		code: string,
		codeVerifier: string
	): Promise<OAuthUserProfile> {
		return this.getGoogleProfile(code, codeVerifier)
	}

	private async getGoogleProfile(
		code: string,
		codeVerifier: string
	): Promise<OAuthUserProfile> {
		const tokens = await this.google.validateAuthorizationCode(
			code,
			codeVerifier
		)
		const idToken = tokens.idToken()
		const claims = decodeJwt(idToken)

		return {
			providerAccountId: claims.sub!,
			email: claims.email as string,
			name: claims.name as string,
		}
	}
}
