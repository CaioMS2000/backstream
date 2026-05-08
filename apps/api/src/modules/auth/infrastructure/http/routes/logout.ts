import { routeSchemas } from '@backstream/shared/types/http/routes/auth/logout'
import { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import { LogoutUseCase } from '@/modules/auth/application/use-cases/logout-use-case'

type LogoutRouteProps = {
	app: HttpApp
	authed: Authed
	logoutUseCase: LogoutUseCase
}

const { response } = routeSchemas

export class LogoutRoute {
	constructor(private readonly props: LogoutRouteProps) {}

	get app() {
		return this.props.app
	}

	get authed() {
		return this.props.authed
	}

	get logoutUseCase() {
		return this.props.logoutUseCase
	}

	register() {
		this.app.post(
			'/logout',
			this.authed(
				async (request, reply) => {
					const allCookies = request.cookies
					// const refreshToken = allCookies['refresh_token']
					const refreshToken = allCookies.refresh_token

					if (!refreshToken) {
						return reply.status(401).send({ error: 'Refresh token not found' })
					}

					const result = await this.logoutUseCase.execute({ refreshToken })

					if (result.isFailure()) {
						return reply.status(500).send({ error: 'Failed to logout' })
					}

					return reply.status(200).send({ message: 'Logged out successfully' })
				},
				{
					schema: {
						tags: ['Auth'],
						summary: 'Realizar logout',
						response,
					},
				}
			)
		)
	}
}
