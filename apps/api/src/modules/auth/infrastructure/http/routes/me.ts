import { UniqueId } from '@backstream/core/unique-id'
import { routeSchemas } from '@backstream/shared/types/http/routes/auth/me'
import type { FastifyInstance } from 'fastify'
import type { Authed } from '@/http/auth-factory'
import type { UserSummaryQuery } from '@/modules/auth/public/queries/user-summary-query'

const { response } = routeSchemas

type MeRouteProps = {
	app: FastifyInstance
	authed: Authed
	userSummaryQuery: UserSummaryQuery
}

export class MeRoute {
	constructor(private readonly props: MeRouteProps) {}

	register() {
		this.props.app.get(
			'/me',
			this.props.authed(
				async (request, reply) => {
					const summary = await this.props.userSummaryQuery.findById(
						UniqueId(request.user.userId)
					)
					if (!summary || summary.isRevoked) {
						return reply.status(401).send({ error: 'unauthorized' })
					}
					return reply.status(200).send({
						userId: summary.id,
						email: summary.email,
						roles: summary.roles,
					})
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
