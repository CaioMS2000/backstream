import { routeSchemas } from '@backstream/shared/types/http/routes/auth/social-login/google-callback'
import { ArcticFetchError, OAuth2RequestError } from 'arctic'
import { env } from '@/config'
import type { RegisterUserViaSocialUseCase } from '@/features/registration/application/use-cases/register-user-via-social-use-case'
import type { HttpApp } from '@/http/app'
import {
	OAUTH_ACCESS_TOKEN_HANDOFF_SECONDS,
	REFRESH_TOKEN_EXPIRY_SECONDS,
} from '@/modules/auth/application/constants'
import type { OAuthStateRepository } from '@/modules/auth/application/repositories/oauth-state-repository'
import type { OAuthProviderService } from '@/modules/auth/infrastructure/auth/oauth-provider-service'

type GoogleSocialLoginCallbackRouteProps = {
	app: HttpApp
	oauthProviderService: OAuthProviderService
	oauthStateRepository: OAuthStateRepository
	registerUserViaSocialUseCase: RegisterUserViaSocialUseCase
}

const { query, response } = routeSchemas

export class GoogleSocialLoginCallbackRoute {
	constructor(private readonly props: GoogleSocialLoginCallbackRouteProps) {}

	register() {
		this.props.app.get('/social-login/google/callback', {
			schema: {
				tags: ['Registration'],
				summary: 'Callback de OAuth do Google',
				security: [],
				querystring: query,
				response,
			},
			handler: async (request, reply) => {
				const { code, state } = request.query

				const stateData =
					await this.props.oauthStateRepository.findAndDelete(state)

				if (!stateData || stateData.provider !== 'google') {
					return reply.status(400).send({ error: 'Invalid or expired state' })
				}

				try {
					const profile =
						await this.props.oauthProviderService.validateCodeAndGetProfile(
							'google',
							code,
							stateData.codeVerifier
						)

					if (stateData.role !== 'streamer' && stateData.role !== 'donor') {
						return reply
							.status(400)
							.send({ error: 'Invalid role for social login' })
					}

					const result = await this.props.registerUserViaSocialUseCase.execute({
						provider: 'google',
						providerAccountId: profile.providerAccountId,
						email: profile.email,
						name: profile.name,
						role: stateData.role,
					})

					if (result.isFailure()) {
						return reply.redirect(
							`${env.FRONTEND_URL}/oauth-error?reason=login-failed`
						)
					}

					reply.setCookie('refresh_token', result.value.refreshToken, {
						httpOnly: true,
						secure: env.NODE_ENV === 'production',
						sameSite: 'lax',
						path: '/',
						maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
					})

					reply.setCookie('access_token_handoff', result.value.accessToken, {
						httpOnly: false,
						secure: env.NODE_ENV === 'production',
						sameSite: 'lax',
						path: '/',
						maxAge: OAUTH_ACCESS_TOKEN_HANDOFF_SECONDS,
					})

					return reply.redirect(
						`${env.FRONTEND_URL}/oauth-success?new=${result.value.isNewUser}`
					)
				} catch (err) {
					if (err instanceof OAuth2RequestError) {
						const userFacing =
							err.code === 'invalid_grant' || err.code === 'invalid_request'
						if (!userFacing) {
							request.log.error({ err }, 'OAuth provider config error')
						}
						return reply.redirect(
							`${env.FRONTEND_URL}/oauth-error?reason=${userFacing ? 'invalid-code' : 'unknown'}`
						)
					}
					if (err instanceof ArcticFetchError) {
						request.log.warn({ err }, 'OAuth provider network error')
						return reply.redirect(
							`${env.FRONTEND_URL}/oauth-error?reason=provider-unavailable`
						)
					}
					request.log.error({ err }, 'Unexpected error in OAuth callback')
					return reply.redirect(
						`${env.FRONTEND_URL}/oauth-error?reason=unknown`
					)
				}
			},
		})
	}
}
