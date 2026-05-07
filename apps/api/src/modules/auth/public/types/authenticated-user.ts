import type { Role } from '../../domain/role'

export type AuthenticatedUser = {
	userId: string
	email: string
	roles: Role[]
}
