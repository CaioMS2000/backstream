import { ZodType } from 'zod'

export type RouteSchemas = {
	headers?: ZodType | null
	query?: ZodType | null
	params?: ZodType | null
	body?: ZodType | null
	response?: Record<number, ZodType> | null
}
