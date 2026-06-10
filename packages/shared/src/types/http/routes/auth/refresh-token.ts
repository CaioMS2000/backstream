import { z } from 'zod'
import { unauthorizedResponseSchema } from '../../responses'
import type { RouteSchemas } from '../../types/route'

const response = {
	200: z.object({
		accessToken: z.string(),
	}),
	...unauthorizedResponseSchema,
}

export const routeSchemas = {
	response,
} as const satisfies RouteSchemas
