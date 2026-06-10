import { z } from 'zod'
import { errorSchema, unauthorizedResponseSchema } from '../../responses'
import type { RouteSchemas } from '../../types/route'

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
