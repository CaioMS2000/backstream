import { z } from 'zod'
import { errorSchema } from '../../../responses'
import type { RouteSchemas } from '../../../types/route'

const body = z.object({
	role: z.enum(['streamer', 'donor']),
})

const response = {
	200: z.object({
		url: z.url(),
	}),
	400: errorSchema,
}

export const routeSchemas = {
	body,
	response,
} as const satisfies RouteSchemas
