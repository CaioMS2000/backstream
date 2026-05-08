import type {
	CreateAuthorizationURLResult,
	OAuthProviderAdapter,
} from './oauth-adapters/oauth-provider-adapter'
import type { OAuthProvider, OAuthUserProfile } from './oauth-types'

export class OAuthProviderService {
	private adapters: Map<OAuthProvider, OAuthProviderAdapter>

	constructor(adapters: OAuthProviderAdapter[]) {
		this.adapters = new Map(adapters.map(a => [a.provider, a]))
	}

	createAuthorizationURL(
		provider: OAuthProvider
	): CreateAuthorizationURLResult {
		return this.getAdapter(provider).createAuthorizationURL()
	}

	validateCodeAndGetProfile(
		provider: OAuthProvider,
		code: string,
		codeVerifier: string | null
	): Promise<OAuthUserProfile> {
		return this.getAdapter(provider).validateCodeAndGetProfile(
			code,
			codeVerifier
		)
	}

	private getAdapter(provider: OAuthProvider): OAuthProviderAdapter {
		const adapter = this.adapters.get(provider)
		if (!adapter) {
			throw new Error(`No OAuth adapter registered for provider "${provider}"`)
		}
		return adapter
	}
}
