import { unauthorizedResponseSchema } from '../../responses'
import type { RouteSchemas } from '../../types/route'
import { userSchema } from '../../types/user'

const response = {
	200: userSchema,
	...unauthorizedResponseSchema,
} as const

export const routeSchemas = {
	response,
} as const satisfies RouteSchemas
