import { routeSchemas } from '@backstream/shared/types/http/routes/auth/login'
import { env } from '@/config'
import { HttpApp } from '@/http/app'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '@/modules/auth/application/constants'
import { LoginUseCase } from '@/modules/auth/application/use-cases/login-use-case'
import { ProfileSummaryComposer } from '@/shared/http/profile-summary-composer'

type LoginRouteProps = {
	app: HttpApp
	loginUseCase: LoginUseCase
	profileComposer: ProfileSummaryComposer
}

const { body, response } = routeSchemas

export class LoginRoute {
	constructor(private readonly props: LoginRouteProps) {}

	get app() {
		return this.props.app
	}

	get loginUseCase() {
		return this.props.loginUseCase
	}

	get profileComposer() {
		return this.props.profileComposer
	}

	register() {
		this.app.post('/login', {
			schema: {
				tags: ['Auth'],
				summary: 'Realizar login com email e senha',
				security: [],
				body,
				response,
			},
			handler: async ({ body }, reply) => {
				const result = await this.loginUseCase.execute(body)

				if (result.isFailure()) {
					return reply.status(401).send({ error: result.value.message })
				}

				reply.setCookie('refresh_token', result.value.refreshToken, {
					httpOnly: true,
					secure: env.NODE_ENV === 'production',
					sameSite: 'strict',
					path: '/',
					maxAge: REFRESH_TOKEN_EXPIRY_SECONDS,
				})

				const user = await this.profileComposer.compose(result.value.user)

				return reply.status(200).send({
					accessToken: result.value.accessToken,
					user,
				})
			},
		})
	}
}
