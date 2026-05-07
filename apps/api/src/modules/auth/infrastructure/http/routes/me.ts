import { routeSchemas } from '@backstream/shared/types/http/routes/auth/me'
import type { FastifyInstance } from 'fastify'
import type { Authed } from '@/http/auth-factory'

const { response } = routeSchemas

type MeRouteProps = {
	app: FastifyInstance
	authed: Authed
}

export class MeRoute {
	constructor(private readonly props: MeRouteProps) {}

	register() {
		this.props.app.get(
			'/me',
			this.props.authed(
				async (request, reply) => {
					return reply.status(200).send(request.user)
				},
				{
					schema: {
						tags: ['Auth'],
						summary: 'Retornar dados do usuário autenticado',
						response,
					},
				}
			)
		)
	}
}
