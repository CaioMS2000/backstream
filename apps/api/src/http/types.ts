import type {
	FastifyReply,
	FastifyRequest,
	RouteGenericInterface,
} from 'fastify'
import type { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'

export type AuthenticatedRequest<
	T extends RouteGenericInterface = RouteGenericInterface,
> = FastifyRequest<T> & { user: AuthenticatedUser }

export type AuthHandler<
	T extends RouteGenericInterface = RouteGenericInterface,
> = (
	req: AuthenticatedRequest<T>,
	reply: FastifyReply
) => unknown | Promise<unknown>
