import { z } from 'zod'
import { errorSchema } from '../../responses'
import { Role } from '../../types/role'
import type { RouteSchemas } from '../../types/route'
import { userSchema } from '../../types/user'

const body = z.object({
	email: z.email(),
	password: z.string().min(3),
	role: z.enum(Role),
})

const response = {
	200: z.object({
		user: userSchema,
	}),
	409: errorSchema,
}

export const routeSchemas = {
	body,
	response,
} as const satisfies RouteSchemas
