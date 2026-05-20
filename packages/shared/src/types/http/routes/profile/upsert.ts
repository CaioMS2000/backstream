import type { RouteSchemas } from '../../types/route'
import { z } from 'zod'
import { errorSchema } from '../../responses'

const body = z.object({
	name: z.string().min(2).max(300),
	phone: z.string().min(3).nullable().default(null),
})

const response = {
	200: z.object({
		profile: z.object({
			name: z.string().min(2).max(300),
			phone: z.string().min(3).nullable().default(null),
		}),
	}),
	400: errorSchema, // InvalidValueError (phone malformado)
	409: errorSchema, // PhoneAlreadyRegisteredError
}

export const routeSchemas = {
	body,
	response,
} as const satisfies RouteSchemas
