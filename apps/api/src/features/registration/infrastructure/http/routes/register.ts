import { routeSchemas } from '@backstream/shared/types/http/routes/auth/register'
import type { HttpApp } from '@/http/app'
import type { RegisterUserUseCase } from '@/features/registration/application/use-cases/register-user.use-case'

type RegisterRouteProps = {
	app: HttpApp
	registerUserUseCase: RegisterUserUseCase
}

const { body, response } = routeSchemas

export class RegisterRoute {
	constructor(private readonly props: RegisterRouteProps) {}

	register() {
		this.props.app.post('/register', {
			schema: {
				tags: ['Registration'],
				summary: 'Realizar cadastro com email e senha',
				security: [],
				body,
				response,
			},
			handler: async ({ body }, reply) => {
				const result = await this.props.registerUserUseCase.execute(body)

				if (result.isFailure()) {
					return reply.status(409).send({ error: result.value.message })
				}

				return reply.status(200).send({ user: result.value.user })
			},
		})
	}
}
