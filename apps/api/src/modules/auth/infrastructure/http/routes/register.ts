import { routeSchemas } from '@backstream/shared/types/http/routes/auth/register'
import { HttpApp } from '@/http/app'
import { RegisterUseCase } from '@/modules/auth/application/use-cases/register-use-case'

type RegisterRouteProps = {
	app: HttpApp
	registerUseCase: RegisterUseCase
}

const { body, response } = routeSchemas

export class RegisterRoute {
	constructor(private readonly props: RegisterRouteProps) {}

	get app() {
		return this.props.app
	}

	get registerUseCase() {
		return this.props.registerUseCase
	}

	register() {
		this.app.post('/register', {
			schema: {
				tags: ['Auth'],
				summary: 'Realizar cadastro com email e senha',
				security: [],
				body,
				response,
			},
			handler: async ({ body }, reply) => {
				const result = await this.registerUseCase.execute(body)

				if (result.isFailure()) {
					return reply.status(409).send({ error: result.value.message })
				}

				return reply.status(200).send(result.value)
			},
		})
	}
}
