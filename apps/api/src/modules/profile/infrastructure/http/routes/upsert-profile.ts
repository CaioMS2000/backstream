import { routeSchemas } from '@backstream/shared/types/http/routes/profile/upsert'
import type { FastifyReply } from 'fastify'
import { HttpApp } from '@/http/app'
import type { Authed } from '@/http/auth-factory'
import { InvalidValueError } from '@/@errors/invalid-value-error'
import { PhoneAlreadyRegisteredError } from '@/modules/profile/application/@errors'
import { ProfileAlreadyExistsError } from '@/modules/profile/application/@errors/profile-already-exists-error'
import { ProfileNotFoundError } from '@/modules/profile/application/@errors/profile-not-found-error'
import { CreateProfileUseCase } from '@/modules/profile/application/use-cases/create-profile-use-case'
import { UpdateProfileUseCase } from '@/modules/profile/application/use-cases/update-profile-use-case'
import { Profile } from '@/modules/profile/domain/profile'

const { response, body } = routeSchemas

type UpsertProfileProps = {
	app: HttpApp
	authed: Authed
	createProfileUseCase: CreateProfileUseCase
	updateProfileUseCase: UpdateProfileUseCase
}

export class UpsertProfileRoute {
	constructor(private readonly props: UpsertProfileProps) {}

	register() {
		this.props.app.put(
			'/profile',
			this.props.authed(
				async (request, reply) => {
					const userId = request.user.userId
					const { name, phone } = request.body
					const input = { userId, name, phone }

					const updateResult =
						await this.props.updateProfileUseCase.execute(input)

					if (updateResult.isSuccess()) {
						return reply
							.status(200)
							.send(this.toView(updateResult.value.profile))
					}

					// ProfileNotFoundError = sinal de "ainda não existe" → cria.
					// Qualquer outro erro do update é resposta final.
					if (!(updateResult.value instanceof ProfileNotFoundError)) {
						return this.respondError(reply, updateResult.value)
					}

					const createResult =
						await this.props.createProfileUseCase.execute(input)

					if (createResult.isSuccess()) {
						return reply
							.status(200)
							.send(this.toView(createResult.value.profile))
					}

					return this.respondError(reply, createResult.value)
				},
				{
					schema: {
						tags: ['Profile'],
						summary: 'Criar ou atualizar perfil do usuário autenticado',
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
			| ProfileAlreadyExistsError
			| InvalidValueError
	) {
		if (
			error instanceof PhoneAlreadyRegisteredError ||
			error instanceof ProfileAlreadyExistsError
		) {
			return reply.status(409).send({ error: error.message })
		}

		return reply.status(400).send({ error: error.message })
	}
}
