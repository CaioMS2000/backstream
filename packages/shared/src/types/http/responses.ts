import z from 'zod'

export const errorSchema = z.object({ error: z.string() })
export const unauthorizedResponseSchema = {
	401: errorSchema,
} as const
