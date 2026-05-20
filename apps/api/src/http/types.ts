import type {
	FastifyReply,
	FastifyRequest,
	FastifySchema,
	RouteGenericInterface,
} from 'fastify'
import type { z, ZodType } from 'zod'
import type { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'

// -- inferência manual a partir do schema Zod --

type InferZod<T> = T extends ZodType ? z.infer<T> : unknown

type SchemaToGeneric<S> = {
	Body: InferZod<S extends { body: infer B } ? B : never>
	Params: InferZod<S extends { params: infer P } ? P : never>
	Querystring: InferZod<S extends { querystring: infer Q } ? Q : never>
}

// -- request autenticada que sabe ler o schema --

export type AuthenticatedRequest<
	T extends RouteGenericInterface = RouteGenericInterface,
> = FastifyRequest<T> & { user: AuthenticatedUser }

export type AuthenticatedRequestFromSchema<S extends FastifySchema> =
	AuthenticatedRequest<SchemaToGeneric<S>>

export type AuthHandler<
	T extends RouteGenericInterface = RouteGenericInterface,
> = (
	req: AuthenticatedRequest<T>,
	reply: FastifyReply
) => unknown | Promise<unknown>

export type AuthHandlerWithSchema<S extends FastifySchema> = (
	req: AuthenticatedRequestFromSchema<S>,
	reply: FastifyReply
) => unknown | Promise<unknown>
