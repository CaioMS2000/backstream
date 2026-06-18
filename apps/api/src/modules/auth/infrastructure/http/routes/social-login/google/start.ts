import { routeSchemas } from '@backstream/shared/types/http/routes/auth/social-login/google-start'
import type { HttpApp } from '@/http/app'
import { OAUTH_STATE_EXPIRY_SECONDS } from '@/modules/auth/application/constants'
import type { OAuthStateRepository } from '@/modules/auth/application/repositories/oauth-state-repository'
import type { OAuthProviderService } from '@/modules/auth/infrastructure/auth/oauth-provider-service'

type GoogleSocialLoginStartRouteProps = {
	app: HttpApp
	oauthProviderService: OAuthProviderService
	oauthStateRepository: OAuthStateRepository
}

const { body, response } = routeSchemas

export class GoogleSocialLoginStartRoute {
	constructor(private readonly props: GoogleSocialLoginStartRouteProps) {}

	register() {
		this.props.app.post('/social-login/google/start', {
			schema: {
				tags: ['Auth'],
				summary: 'Iniciar login com Google (gera URL de autorização)',
				security: [],
				body,
				response,
			},
			handler: async ({ body }, reply) => {
				const { url, state, codeVerifier } =
					this.props.oauthProviderService.createAuthorizationURL('google')

				if (!codeVerifier) {
					return reply
						.status(400)
						.send({ error: 'Provider config missing PKCE' })
				}

				await this.props.oauthStateRepository.insert(
					state,
					{ codeVerifier, provider: 'google', role: body.role },
					OAUTH_STATE_EXPIRY_SECONDS
				)

				return reply.status(200).send({ url: url.toString() })
			},
		})
	}
}
