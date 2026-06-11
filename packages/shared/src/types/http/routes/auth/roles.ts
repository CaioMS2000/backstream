import { z } from 'zod'
import { errorSchema, unauthorizedResponseSchema } from '../../responses'
import { Role } from '../../types/role'
import type { RouteSchemas } from '../../types/route'

const params = z.object({
	role: z.enum(Role),
})

const response = {
	200: z.object({
		roles: z.array(z.enum(Role)),
	}),
	...unauthorizedResponseSchema, // 401
	403: errorSchema, // RoleNotSelfAssignableError (admin)
	404: errorSchema, // UserNotFoundError
	409: errorSchema, // CannotRemoveLastRoleError
}

export const routeSchemas = {
	params,
	response,
} as const satisfies RouteSchemas
