import {
	anything,
	instance,
	mock,
	verify,
	when,
} from '@johanblumenberg/ts-mockito'
import { AdminRepository } from '../../repositories/admin-repository'
import { InstructorRepository } from '../../repositories/instructor-repository'
import { StudentRepository } from '../../repositories/student-repository'
import { OAuthAccountRepository } from '../../repositories/oauth-account-repository'
import { RefreshTokenRepository } from '../../repositories/refresh-token-repository'
import { FakeIdGenerator } from '@/modules/auth-and-users/test/fake-id-generator'
import { SocialLoginUseCase } from './social-login-use-case'
import { UniqueId } from '@repo/core'

const fakeTokenService = {
	sign: async () => 'fake-access-token',
	signAccessToken: async () => 'fake-access-token',
	verifyAccessToken: async () => null,
	verify: async () => ({}),
	decode: async () => ({}),
}

const fakeTokenGenerator = {
	generateRefreshToken: async () => 'fake-refresh-token',
	hashRefreshToken: async () => 'fake-refresh-token-hash',
}

describe('SocialLoginUseCase', () => {
	let adminRepo: AdminRepository
	let instructorRepo: InstructorRepository
	let studentRepo: StudentRepository
	let oauthAccountRepo: OAuthAccountRepository
	let refreshTokenRepo: RefreshTokenRepository
	let sut: SocialLoginUseCase

	const input = {
		provider: 'google',
		providerAccountId: 'google-123',
		email: 'user@example.com',
		name: 'Test User',
		role: 'STUDENT' as const,
	}

	beforeEach(() => {
		adminRepo = mock(AdminRepository)
		instructorRepo = mock(InstructorRepository)
		studentRepo = mock(StudentRepository)
		oauthAccountRepo = mock(OAuthAccountRepository)
		refreshTokenRepo = mock(RefreshTokenRepository)

		when(
			refreshTokenRepo.save(anything(), anything(), anything(), anything())
		).thenResolve()
		when(oauthAccountRepo.save(anything())).thenResolve({ id: 'oauth-1' })

		sut = new SocialLoginUseCase({
			adminRepository: instance(adminRepo),
			instructorRepository: instance(instructorRepo),
			studentRepository: instance(studentRepo),
			oauthAccountRepository: instance(oauthAccountRepo),
			refreshTokenRepository: instance(refreshTokenRepo),
			jwtService: fakeTokenService as any,
			tokenGenerator: fakeTokenGenerator as any,
			idGenerator: new FakeIdGenerator(),
		})
	})

	it('should login existing user when provider account is already linked', async () => {
		const userId = UniqueId('user-1')

		when(
			oauthAccountRepo.findByProviderAndAccountId('google', 'google-123')
		).thenResolve({
			id: 'oauth-1',
			userId,
			provider: 'google',
			providerAccountId: 'google-123',
		})

		when(studentRepo.findById(userId)).thenResolve({
			id: userId,
			name: 'Test User',
			email: 'user@example.com',
			passwordHash: null,
			status: 'active' as any,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as any)

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.id).toBe(userId)
			expect(result.value.accessToken).toBe('fake-access-token')
		}

		verify(oauthAccountRepo.save(anything())).never()
	})

	it('should auto-link and login when user with same email exists', async () => {
		const userId = UniqueId('user-1')

		when(
			oauthAccountRepo.findByProviderAndAccountId('google', 'google-123')
		).thenResolve(null)

		when(studentRepo.findByEmail('user@example.com')).thenResolve({
			id: userId,
			name: 'Test User',
			email: 'user@example.com',
			passwordHash: 'some-hash',
			status: 'active' as any,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as any)

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(false)
			expect(result.value.user.role).toBe('STUDENT')
		}

		verify(oauthAccountRepo.save(anything())).once()
	})

	it('should create new user when no existing user is found', async () => {
		when(
			oauthAccountRepo.findByProviderAndAccountId('google', 'google-123')
		).thenResolve(null)

		when(studentRepo.findByEmail('user@example.com')).thenResolve(null)
		when(studentRepo.save(anything())).thenResolve()

		const result = await sut.execute(input)

		expect(result.isSuccess()).toBe(true)
		if (result.isSuccess()) {
			expect(result.value.isNewUser).toBe(true)
			expect(result.value.user.role).toBe('STUDENT')
		}

		verify(studentRepo.save(anything())).once()
		verify(oauthAccountRepo.save(anything())).once()
	})
})
