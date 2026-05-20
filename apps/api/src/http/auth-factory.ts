// auth-factory.ts
import type {
	preHandlerAsyncHookHandler,
	FastifySchema,
	RouteHandlerMethod,
	RouteShorthandOptions,
} from 'fastify'
import type { AuthHandler, AuthHandlerWithSchema } from './types'

export function makeAuthed(authenticate: preHandlerAsyncHookHandler) {
	// overload 1: com schema → infere body/params/query
	function authed<S extends FastifySchema>(
		handler: AuthHandlerWithSchema<S>,
		extra: RouteShorthandOptions & { schema: S }
	): RouteShorthandOptions & { handler: RouteHandlerMethod }

	// overload 2: sem schema → AuthHandler clássico (tudo unknown)
	function authed(
		handler: AuthHandler,
		extra?: RouteShorthandOptions
	): RouteShorthandOptions & { handler: RouteHandlerMethod }

	function authed(handler: unknown, extra: RouteShorthandOptions = {}) {
		return {
			...extra,
			preHandler: extra.preHandler
				? [
						authenticate,
						...(Array.isArray(extra.preHandler)
							? extra.preHandler
							: [extra.preHandler]),
					]
				: [authenticate],
			handler: handler as RouteHandlerMethod,
		}
	}

	return authed
}

export type Authed = ReturnType<typeof makeAuthed>
