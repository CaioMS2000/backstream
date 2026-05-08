import type { RouteSchemas } from '../../types/route'
import { z } from 'zod'
import { unauthorizedResponseSchema } from '../../responses'

const response = {
	200: z.object({
		accessToken: z.string(),
	}),
	...unauthorizedResponseSchema,
}

export const routeSchemas = {
	response,
} as const satisfies RouteSchemas
