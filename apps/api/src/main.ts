import { initializeClock } from '@/shared/infrastructure/clock'
import { initializeIdGenerator } from '@/shared/infrastructure/id-generator'

async function bootstrap() {
	// 1. Config primeiro — valida env, falha cedo se algo faltar
	// const { env } = await import('@/config/env')
	void (await import('@/config/env'))

	// 2. Singletons globais
	initializeIdGenerator('v7')
	initializeClock()
}

bootstrap().catch(err => {
	console.error('System bootstrap failed', err)
	process.exit(1)
})
