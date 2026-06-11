import { routeSchemas } from '@backstream/shared/types/http/routes/auth/roles'
import type { FastifyReply } from 'fastify'
import { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import {
	CannotRemoveLastRoleError,
	RoleNotSelfAssignableError,
	UserNotFoundError,
} from '@/modules/auth/application/@errors'
import { AddRoleUseCase } from '@/modules/auth/application/use-cases/add-role-use-case'
import { RemoveRoleUseCase } from '@/modules/auth/application/use-cases/remove-role-use-case'

const { params, response } = routeSchemas

type ManageRolesProps = {
	app: HttpApp
	authed: Authed
	addRoleUseCase: AddRoleUseCase
	removeRoleUseCase: RemoveRoleUseCase
}

// As roles vivem no access token (JWT); após add/remove o token atual fica
// desatualizado até o refresh. A resposta devolve as roles novas pro cliente,
// mas a autorização só reflete depois do refresh. Não reemitimos token aqui.
export class ManageRolesRoute {
	constructor(private readonly props: ManageRolesProps) {}

	register() {
		this.props.app.post(
			'/me/roles/:role',
			this.props.authed(
				async (request, reply) => {
					const result = await this.props.addRoleUseCase.execute({
						userId: request.user.userId,
						role: request.params.role,
					})

					if (result.isSuccess()) {
						return reply.status(200).send({ roles: result.value.roles })
					}

					return this.respondError(reply, result.value)
				},
				{
					schema: {
						tags: ['Auth'],
						summary: 'Adicionar uma role ao usuário autenticado',
						params,
						response,
					},
				}
			)
		)

		this.props.app.delete(
			'/me/roles/:role',
			this.props.authed(
				async (request, reply) => {
					const result = await this.props.removeRoleUseCase.execute({
						userId: request.user.userId,
						role: request.params.role,
					})

					if (result.isSuccess()) {
						return reply.status(200).send({ roles: result.value.roles })
					}

					return this.respondError(reply, result.value)
				},
				{
					schema: {
						tags: ['Auth'],
						summary: 'Remover uma role do usuário autenticado',
						params,
						response,
					},
				}
			)
		)
	}

	private respondError(
		reply: FastifyReply,
		error:
			| UserNotFoundError
			| RoleNotSelfAssignableError
			| CannotRemoveLastRoleError
	) {
		if (error instanceof RoleNotSelfAssignableError) {
			return reply.status(403).send({ error: error.message })
		}

		if (error instanceof UserNotFoundError) {
			return reply.status(404).send({ error: error.message })
		}

		return reply.status(409).send({ error: error.message })
	}
}
