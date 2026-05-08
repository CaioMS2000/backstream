import { z } from 'zod'
import { errorSchema } from '../../../responses'
import type { RouteSchemas } from '../../../types/route'

const query = z.object({
	code: z.string().min(1),
	state: z.string().min(1),
})

const response = {
	302: z.null(),
	400: errorSchema,
}

export const routeSchemas = {
	query,
	response,
} as const satisfies RouteSchemas
