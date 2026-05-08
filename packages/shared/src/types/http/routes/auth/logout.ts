import type { RouteSchemas } from '../../types/route'
import { z } from 'zod'
import { errorSchema, unauthorizedResponseSchema } from '../../responses'

const response = {
	200: z.object({
		message: z.string(),
	}),
	500: errorSchema,
	...unauthorizedResponseSchema,
}

export const routeSchemas = {
	response,
} as const satisfies RouteSchemas
