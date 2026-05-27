import { AsyncLocalStorage } from 'node:async_hooks'
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	inject,
	it,
} from 'vitest'
import { createDrizzle, type DrizzleClient } from '@/lib/drizzle'
import { PasswordCredential } from '@/modules/auth/domain/password-credential'
import { User } from '@/modules/auth/domain/user'
import { DrizzlePasswordCredentialRepository } from '@/modules/auth/infrastructure/database/repositories/password-credential-repository'
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/database/repositories/user-repository'
import {
	passwordCredential as passwordCredentialTable,
	user as userTable,
} from '@/modules/auth/infrastructure/database/schemas'
import { Email } from '@/shared/domain'
import {
	__resetClockForTests,
	initializeClock,
	now,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { resetDb } from '@/test/reset-db'
import type { DrizzleTx } from './db-context'
import { DrizzleTransactionService } from './drizzle-transaction-service'

describe('DrizzleTransactionService (integration)', () => {
	let db: DrizzleClient
	let txService: DrizzleTransactionService
	let userRepository: DrizzleUserRepository
	let passwordCredentialRepository: DrizzlePasswordCredentialRepository

	beforeAll(() => {
		initializeClock()
		initializeIdGenerator('v7')

		db = createDrizzle(inject('databaseUrl'))
		txService = new DrizzleTransactionService(
			db,
			new AsyncLocalStorage<DrizzleTx>()
		)
		userRepository = new DrizzleUserRepository(txService)
		passwordCredentialRepository = new DrizzlePasswordCredentialRepository(
			txService
		)
	})

	afterEach(async () => {
		await resetDb(db)
	})

	afterAll(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	async function makeUser(email = 'tx-test@example.com') {
		const emailResult = Email.create(email)
		if (emailResult.isFailure()) throw new Error('invalid test email')

		return User.create({
			email: emailResult.value,
			roles: ['donor'],
			now: now(),
		})
	}

	it('persiste fora de run() — caminho default da conexão', async () => {
		const user = await makeUser()
		await userRepository.save(user)

		const rows = await db.select().from(userTable)
		expect(rows).toHaveLength(1)
		expect(rows[0].id).toBe(user.id)
	})

	it('persiste dentro de run() quando commita com sucesso', async () => {
		const user = await makeUser()

		await txService.run(async () => {
			await userRepository.save(user)
		})

		const rows = await db.select().from(userTable)
		expect(rows).toHaveLength(1)
		expect(rows[0].id).toBe(user.id)
	})

	it('faz rollback de toda a tx quando o callback lança', async () => {
		const user = await makeUser()

		await expect(
			txService.run(async () => {
				await userRepository.save(user)
				throw new Error('boom')
			})
		).rejects.toThrow('boom')

		const rows = await db.select().from(userTable)
		expect(rows).toHaveLength(0)
	})

	it('atomicidade entre dois repositórios — falha no segundo desfaz o primeiro', async () => {
		const user = await makeUser()
		const passwordHash = 'irrelevant'
		const credential = await PasswordCredential.create({
			userId: user.id,
			passwordHash,
			now: now(),
		})

		await expect(
			txService.run(async () => {
				await userRepository.save(user)
				await passwordCredentialRepository.save(credential)
				throw new Error('boom')
			})
		).rejects.toThrow('boom')

		const users = await db.select().from(userTable)
		const credentials = await db.select().from(passwordCredentialTable)
		expect(users).toHaveLength(0)
		expect(credentials).toHaveLength(0)
	})

	it('commita ambos os saves quando o callback termina sem lançar', async () => {
		const user = await makeUser()
		const credential = await PasswordCredential.create({
			userId: user.id,
			passwordHash: 'irrelevant',
			now: now(),
		})

		await txService.run(async () => {
			await userRepository.save(user)
			await passwordCredentialRepository.save(credential)
		})

		const users = await db.select().from(userTable)
		const credentials = await db.select().from(passwordCredentialTable)
		expect(users).toHaveLength(1)
		expect(credentials).toHaveLength(1)
		expect(credentials[0].userId).toBe(user.id)
	})
})
