import type { RouteSchemas } from '../../types/route'
import { z } from 'zod'
import { userSchema } from '../../types/user'
import { errorSchema } from '../../responses'
import { Role } from '../../types/role'

const body = z.object({
	name: z.string().min(2).max(100),
	email: z.email(),
	password: z.string().min(3),
	phone: z.string().min(3).nullable().default(null),
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
