import z from 'zod'
import { Role } from './role'

export const userSchema = z.object({
	userId: z.string(),
	email: z.email(),
	roles: z.array(z.enum(Role)),
})
