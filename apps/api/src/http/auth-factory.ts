import type {
	preHandlerAsyncHookHandler,
	RouteGenericInterface,
	RouteHandlerMethod,
	RouteShorthandOptions,
} from 'fastify'
import { AuthHandler } from './types'

export function makeAuthed(authenticate: preHandlerAsyncHookHandler) {
	return function authed<T extends RouteGenericInterface>(
		handler: AuthHandler<T>,
		extra: RouteShorthandOptions = {}
	): RouteShorthandOptions & { handler: RouteHandlerMethod } {
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
}

export type Authed = ReturnType<typeof makeAuthed>
