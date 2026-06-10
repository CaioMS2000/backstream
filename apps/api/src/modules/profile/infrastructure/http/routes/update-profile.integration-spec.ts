import { AsyncLocalStorage } from 'node:async_hooks'
import { DomainEventDispatcher } from '@backstream/core/events/domain-event-dispatcher'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	inject,
	it,
} from 'vitest'
import { createApp, type HttpApp } from '@/http/app'
import { makeAuthed } from '@/http/auth-factory'
import { makeAuthGuard } from '@/http/middleware/auth/authed'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import type { Role } from '@/modules/auth/domain/role'
import { AccessTokenVerifier } from '@/modules/auth/public/services/access-token-verifier'
import type { AuthenticatedUser } from '@/modules/auth/public/types/authenticated-user'
import { UpdateProfileUseCase } from '@/modules/profile/application/use-cases/update-profile-use-case'
import { DrizzleProfileRepository } from '@/modules/profile/infrastructure/database/repositories/profile-repository'
import { profile as profileTable } from '@/modules/profile/infrastructure/database/schemas'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import type { DrizzleTx } from '@/shared/transaction/db-context'
import { DrizzleTransactionService } from '@/shared/transaction/drizzle-transaction-service'
import { resetDb } from '@/test/reset-db'
import { UpdateProfileRoute } from './update-profile'

const USER_ID = 'user-1'
const USER_EMAIL = 'caio@example.com'

class FakeAccessTokenVerifier extends AccessTokenVerifier {
	async verify(token: string): Promise<AuthenticatedUser | null> {
		if (token !== 'valid-access-token') return null
		return {
			userId: USER_ID,
			email: USER_EMAIL,
			roles: ['donor'] as Role[],
		}
	}
}

const baseBody = {
	name: 'João Silva',
	phone: '5511987654321',
}

describe('PUT /profile (integration)', () => {
	let app: HttpApp
	let db: DrizzleClient

	beforeAll(async () => {
		initializeClock()
		initializeIdGenerator('v7')

		db = createDrizzle(inject('databaseUrl'))
		const txService = new DrizzleTransactionService(
			db,
			new AsyncLocalStorage<DrizzleTx>()
		)

		const profileRepository = new DrizzleProfileRepository(txService)
		const domainEvents = new DomainEventDispatcher()

		const updateProfileUseCase = new UpdateProfileUseCase({
			profileRepository,
			domainEvents,
		})

		const authed = makeAuthed(makeAuthGuard(new FakeAccessTokenVerifier()))

		app = createApp()
		await app.register(async instance => {
			new UpdateProfileRoute({
				app: instance.withTypeProvider<ZodTypeProvider>(),
				authed,
				updateProfileUseCase,
			}).register()
		})
		await app.ready()
	})

	afterEach(async () => {
		await resetDb(db)
	})

	afterAll(async () => {
		await app.close()
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	async function seedProfile(opts: {
		id: string
		userId: string
		name?: string
		phone?: string | null
	}) {
		await db.insert(profileTable).values({
			id: opts.id,
			userId: opts.userId,
			name: opts.name ?? 'Seeded Profile',
			phone: opts.phone ?? null,
		})
	}

	it('retorna 404 quando o usuário ainda não tem profile', async () => {
		const response = await app.inject({
			method: 'PUT',
			url: '/profile',
			headers: { authorization: 'Bearer valid-access-token' },
			payload: baseBody,
		})

		expect(response.statusCode).toBe(404)
		expect(response.json()).toEqual({ error: 'Profile not found' })

		const profiles = await db.select().from(profileTable)
		expect(profiles).toHaveLength(0)
	})

	it('retorna 200 e atualiza o profile quando o usuário já tem um', async () => {
		await seedProfile({
			id: 'profile-existing',
			userId: USER_ID,
			name: 'Nome Antigo',
			phone: null,
		})

		const response = await app.inject({
			method: 'PUT',
			url: '/profile',
			headers: { authorization: 'Bearer valid-access-token' },
			payload: baseBody,
		})

		expect(response.statusCode).toBe(200)
		expect(response.json()).toEqual({
			profile: { name: baseBody.name, phone: baseBody.phone },
		})

		const profiles = await db.select().from(profileTable)
		expect(profiles).toHaveLength(1)
		expect(profiles[0]).toMatchObject({
			id: 'profile-existing',
			userId: USER_ID,
			name: baseBody.name,
			phone: baseBody.phone,
		})
	})

	it('retorna 401 quando o auth header está ausente', async () => {
		const response = await app.inject({
			method: 'PUT',
			url: '/profile',
			payload: baseBody,
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'unauthorized' })
	})

	it('retorna 401 quando o token é inválido', async () => {
		const response = await app.inject({
			method: 'PUT',
			url: '/profile',
			headers: { authorization: 'Bearer wrong-token' },
			payload: baseBody,
		})

		expect(response.statusCode).toBe(401)
		expect(response.json()).toEqual({ error: 'unauthorized' })

		const profiles = await db.select().from(profileTable)
		expect(profiles).toHaveLength(0)
	})

	it('retorna 409 quando o telefone já pertence a outro usuário', async () => {
		await seedProfile({ id: 'profile-me', userId: USER_ID, phone: null })
		await seedProfile({
			id: 'profile-other',
			userId: 'other-user',
			phone: baseBody.phone,
		})

		const response = await app.inject({
			method: 'PUT',
			url: '/profile',
			headers: { authorization: 'Bearer valid-access-token' },
			payload: baseBody,
		})

		expect(response.statusCode).toBe(409)
		expect(response.json()).toEqual({ error: 'Phone already registered' })

		const profiles = await db.select().from(profileTable)
		const mine = profiles.find(p => p.userId === USER_ID)
		expect(mine?.phone).toBeNull()
	})

	it('retorna 400 quando o telefone passa pelo zod mas falha no domínio', async () => {
		await seedProfile({ id: 'profile-me', userId: USER_ID, phone: null })

		const response = await app.inject({
			method: 'PUT',
			url: '/profile',
			headers: { authorization: 'Bearer valid-access-token' },
			payload: { ...baseBody, phone: 'abc' },
		})

		expect(response.statusCode).toBe(400)
		expect(response.json()).toEqual({
			error: 'Phone must have between 12 and 13 digits',
		})

		const mine = (await db.select().from(profileTable)).find(
			p => p.userId === USER_ID
		)
		expect(mine?.phone).toBeNull()
	})
})
