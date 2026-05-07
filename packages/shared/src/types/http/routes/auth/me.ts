import type { RouteSchemas } from '../../types/route'
import { userSchema } from '../../types/user'
import { unauthorizedResponseSchema } from '../../responses'

const response = {
	200: userSchema,
	...unauthorizedResponseSchema,
} as const

export const routeSchemas = {
	response,
} as const satisfies RouteSchemas
