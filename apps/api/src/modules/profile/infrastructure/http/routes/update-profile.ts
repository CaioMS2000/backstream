import { routeSchemas } from '@backstream/shared/types/http/routes/profile/update'
import type { FastifyReply } from 'fastify'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import { PhoneAlreadyRegisteredError } from '@/modules/profile/application/@errors'
import { ProfileNotFoundError } from '@/modules/profile/application/@errors/profile-not-found-error'
import { UpdateProfileUseCase } from '@/modules/profile/application/use-cases/update-profile-use-case'
import { Profile } from '@/modules/profile/domain/profile'

const { response, body } = routeSchemas

type UpdateProfileProps = {
	app: HttpApp
	authed: Authed
	updateProfileUseCase: UpdateProfileUseCase
}

export class UpdateProfileRoute {
	constructor(private readonly props: UpdateProfileProps) {}

	register() {
		this.props.app.put(
			'/profile',
			this.props.authed(
				async (request, reply) => {
					const userId = request.user.userId
					const { name, phone } = request.body

					const result = await this.props.updateProfileUseCase.execute({
						userId,
						name,
						phone,
					})

					if (result.isSuccess()) {
						return reply.status(200).send(this.toView(result.value.profile))
					}

					return this.respondError(reply, result.value)
				},
				{
					schema: {
						tags: ['Profile'],
						summary: 'Atualizar perfil do usuário autenticado',
						response,
						body,
					},
				}
			)
		)
	}

	private toView(profile: Profile) {
		return {
			profile: {
				name: profile.name,
				phone: profile.phone ? profile.phone.value : null,
			},
		}
	}

	private respondError(
		reply: FastifyReply,
		error:
			| PhoneAlreadyRegisteredError
			| ProfileNotFoundError
			| InvalidValueError
	) {
		if (error instanceof ProfileNotFoundError) {
			return reply.status(404).send({ error: error.message })
		}

		if (error instanceof PhoneAlreadyRegisteredError) {
			return reply.status(409).send({ error: error.message })
		}

		return reply.status(400).send({ error: error.message })
	}
}
