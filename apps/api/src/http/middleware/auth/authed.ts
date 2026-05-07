import type { preHandlerAsyncHookHandler } from 'fastify'
import type { AccessTokenVerifier } from '@/modules/auth/public/services/access-token-verifier'
import type { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'

declare module 'fastify' {
	interface FastifyRequest {
		user?: AuthenticatedUser
	}
}

export function makeAuthGuard(
	verifier: AccessTokenVerifier
): preHandlerAsyncHookHandler {
	return async (request, reply) => {
		const header = request.headers.authorization
		if (!header || !header.startsWith('Bearer ')) {
			return reply.code(401).send({ error: 'unauthorized' })
		}

		const token = header.slice('Bearer '.length)
		const claims = await verifier.verify(token)
		if (!claims) {
			return reply.code(401).send({ error: 'unauthorized' })
		}

		request.user = claims
	}
}
