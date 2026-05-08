import { routeSchemas } from '@backstream/shared/types/http/routes/auth/refresh-token'
import { env } from '@/config'
import type { HttpApp } from '@/http/app'
import { TokenReplayDetectedError } from '@/modules/auth/application/@errors'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '@/modules/auth/application/constants'
import { RefreshTokenUseCase } from '@/modules/auth/application/use-cases/refresh-token-use-case'

type RefreshTokenRouteProps = {
	app: HttpApp
	refreshTokenUseCase: RefreshTokenUseCase
}

const { response } = routeSchemas

export class RefreshTokenRoute {
	constructor(private readonly props: RefreshTokenRouteProps) {}

	get app() {
		return this.props.app
	}

	get refreshTokenUseCase() {
		return this.props.refreshTokenUseCase
	}

	register() {
		this.app.post('/refreshToken', {
			schema: {
				tags: ['Auth'],
				summary: 'Refresh JWT tokens',
				security: [{ refreshCookie: [] }],
				response,
			},
			handler: async (request, reply) => {
				const refreshToken = request.cookies.refresh_token

				if (!refreshToken) {
					return reply.status(401).send({ error: 'Refresh token not found' })
				}

				const result = await this.refreshTokenUseCase.execute({
					refreshToken,
				})

				if (result.isFailure()) {
					if (result.value instanceof TokenReplayDetectedError) {
						return reply.status(401).send({
							error: 'Refresh token reuse detected — all sessions revoked',
						})
					}
					return reply.status(401).send({ error: 'Invalid refresh token' })
				}

				const { accessToken, refreshToken: newRefreshToken } = result.value

				reply.setCookie('refresh_token', newRefreshToken, {
					httpOnly: true,
					secure: env.NODE_ENV === 'production',
					sameSite: 'strict',
					path: '/',
					maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
				})

				return reply.status(200).send({ accessToken })
			},
		})
	}
}
