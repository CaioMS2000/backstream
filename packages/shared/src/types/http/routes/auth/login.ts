import type { RouteSchemas } from '../../types/route'
import { z } from 'zod'
import { userSchema } from '../../types/user'
import { unauthorizedResponseSchema } from '../../responses'

const body = z.object({
	email: z.email(),
	password: z.string().min(3),
})

const response = {
	200: z.object({
		accessToken: z.string(),
		// refreshToken: z.string().min(3),
		user: userSchema,
	}),
	...unauthorizedResponseSchema,
}

export const routeSchemas = {
	body,
	response,
} as const satisfies RouteSchemas
