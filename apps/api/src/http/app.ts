import fastifyCookie from '@fastify/cookie'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { fastify } from 'fastify'
import {
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
	ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { requestLogger } from './plugins/request-logger'

const app = fastify({ trustProxy: true }).withTypeProvider<ZodTypeProvider>()
app
	.get('/health', {
		schema: { summary: 'Estado do servidor.', tags: ['Application'] },
		handler: async (request, reply) => {
			return { status: 'ok' }
		},
	})
	.get('/healthy', {
		schema: { summary: 'Estado do servidor.', tags: ['Application'] },
		handler: async (request, reply) => {
			return { status: 'yes' }
		},
	})

export type HttpApp = ReturnType<typeof app.withTypeProvider<ZodTypeProvider>>

// third-party resources
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// zod -> JSON Schema transform com fallback para esquemas já em JSON Schema
const safeTransform: typeof jsonSchemaTransform = input => {
	try {
		return jsonSchemaTransform(input)
	} catch {
		return input.schema as any
	}
}

app.register(swagger, {
	openapi: {
		openapi: '3.1.0',
		info: { title: 'Backstream API', version: '1.0.0' },
		components: {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
				refreshCookie: {
					type: 'apiKey',
					in: 'cookie',
					name: 'refresh_token',
				},
			},
		},
		security: [{ bearerAuth: [] }, { refreshCookie: [] }],
	},
	transform: safeTransform,
})

app.get('/openapi.json', { schema: { hide: true } }, async () => app.swagger())

const theme = new SwaggerTheme()
const content = theme.getBuffer(SwaggerThemeNameEnum.DARK)

app.register(swaggerUI, {
	routePrefix: '/docs/swagger',
	theme: {
		css: [
			{
				filename: 'theme.css',
				content,
			},
		],
	},
	transformSpecificationClone: true,
	transformSpecification(spec, req) {
		const authSpec = (req.server as any)._cachedAuthSpec
		if (!authSpec) return spec

		// Mesclar specs
		return {
			...spec,
			paths: { ...spec.paths, ...authSpec.paths },
			tags: [...(spec.tags ?? []), ...(authSpec.tags ?? [])],
			components: {
				...spec.components,
				schemas: {
					...spec.components?.schemas,
					...authSpec.components?.schemas,
				},
				securitySchemes: {
					...spec.components?.securitySchemes,
					...authSpec.components?.securitySchemes,
				},
			},
		}
	},
})
app.register(ScalarApiReference, {
	routePrefix: '/docs',
	configuration: {
		url: '/openapi.json',
	},
})
app.register(fastifyCookie)

// custom resources
app.register(requestLogger)

export { app }
