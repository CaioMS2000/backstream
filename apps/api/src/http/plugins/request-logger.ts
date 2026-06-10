import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { logger } from '@/shared/logger'

export const requestLogger = fastifyPlugin(async (app: FastifyInstance) => {
	app.addHook('onRequest', async request => {
		if (request.url.includes('health')) {
			return
		}
		;(request as any)._reqStart = process.hrtime.bigint()
		const rid =
			(request.headers['x-request-id'] as string) ||
			Math.random().toString(36).slice(2)
		;(request as any)._reqId = rid
		const hdrs = { ...request.headers }
		if (hdrs.authorization) hdrs.authorization = '***'
		if (hdrs.cookie) hdrs.cookie = '***'
		logger.debug('http_request', {
			component: 'http',
			requestId: rid,
			method: request.method,
			url: request.url,
			headers: hdrs,
		})
	})

	app.addHook('onResponse', async (request, reply) => {
		if (request.url.includes('health')) {
			return
		}
		const rid = (request as any)._reqId
		const start = (request as any)._reqStart as bigint | undefined
		let ms: number | undefined
		if (typeof start === 'bigint') {
			const diffNs = Number(process.hrtime.bigint() - start)
			ms = Math.round(diffNs / 1_000_000)
		}
		logger.info('http_response', {
			component: 'http',
			requestId: rid,
			statusCode: reply.statusCode,
			method: request.method,
			url: request.url,
			latencyMs: ms,
		})
	})
})
