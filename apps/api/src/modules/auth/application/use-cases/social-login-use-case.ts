import { type IdGenerator, type Result, success, UseCase } from '@repo/core'
import type { UniqueId } from '@repo/core'
import type { AdminRepository } from '../../repositories/admin-repository'
import type { InstructorRepository } from '../../repositories/instructor-repository'
import type { StudentRepository } from '../../repositories/student-repository'
import type { OAuthAccountRepository } from '../../repositories/oauth-account-repository'
import type { RefreshTokenRepository } from '../../repositories/refresh-token-repository'
import type { JwtService } from '../../jwt'
import type { JwtTokenGenerator } from '../../jwt'
import { Admin } from '../../../models/admin'
import { Instructor } from '../../../models/instructor'
import { Student } from '../../../models/student'
import { REFRESH_TOKEN_EXPIRY_SECONDS } from '../../constants'
import type { HTTPUser } from '../../../models/http-user'

export type SocialLoginUseCaseRequest = {
	provider: string
	providerAccountId: string
	email: string
	name: string
	role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
}

export type SocialLoginUseCaseResponse = Result<
	never,
	{
		accessToken: string
		refreshToken: string
		user: HTTPUser
		isNewUser: boolean
	}
>

type UseCaseProps = {
	adminRepository: AdminRepository
	instructorRepository: InstructorRepository
	studentRepository: StudentRepository
	oauthAccountRepository: OAuthAccountRepository
	refreshTokenRepository: RefreshTokenRepository
	jwtService: JwtService
	tokenGenerator: JwtTokenGenerator
	idGenerator: IdGenerator
}

export class SocialLoginUseCase extends UseCase<
	SocialLoginUseCaseRequest,
	SocialLoginUseCaseResponse,
	UseCaseProps
> {
	constructor(protected override props: UseCaseProps) {
		super()
	}

	async execute(
		input: SocialLoginUseCaseRequest
	): Promise<SocialLoginUseCaseResponse> {
		// 1. Check if this provider account is already linked
		const existingLink =
			await this.props.oauthAccountRepository.findByProviderAndAccountId(
				input.provider,
				input.providerAccountId
			)

		if (existingLink) {
			const user = await this.findById(existingLink.userId, input.role)
			if (user) {
				return this.issueTokens(user, input.role, false)
			}
		}

		// 2. Check if a user with this email already exists (auto-link)
		const existingUser = await this.findByEmail(input.email, input.role)

		if (existingUser) {
			await this.props.oauthAccountRepository.save({
				userId: existingUser.id,
				provider: input.provider,
				providerAccountId: input.providerAccountId,
			})
			return this.issueTokens(existingUser, input.role, false)
		}

		// 3. Create new user (no password)
		const newUser = await this.createUser(input)

		await this.props.oauthAccountRepository.save({
			userId: newUser.id,
			provider: input.provider,
			providerAccountId: input.providerAccountId,
		})

		return this.issueTokens(newUser, input.role, true)
	}

	private async findById(
		id: UniqueId,
		role: SocialLoginUseCaseRequest['role']
	): Promise<{ id: UniqueId; name: string; email: string } | null> {
		switch (role) {
			case 'ADMIN':
				return this.props.adminRepository.findById(id)
			case 'INSTRUCTOR':
				return this.props.instructorRepository.findById(id)
			case 'STUDENT':
				return this.props.studentRepository.findById(id)
		}
	}

	private async findByEmail(
		email: string,
		role: SocialLoginUseCaseRequest['role']
	): Promise<{ id: UniqueId; name: string; email: string } | null> {
		switch (role) {
			case 'ADMIN':
				return this.props.adminRepository.findByEmail(email)
			case 'INSTRUCTOR':
				return this.props.instructorRepository.findByEmail(email)
			case 'STUDENT':
				return this.props.studentRepository.findByEmail(email)
		}
	}

	private async createUser(
		input: SocialLoginUseCaseRequest
	): Promise<{ id: UniqueId; name: string; email: string }> {
		switch (input.role) {
			case 'ADMIN': {
				const admin = await Admin.create({
					input: { name: input.name, email: input.email, passwordHash: null },
					idGenerator: this.props.idGenerator,
				})
				await this.props.adminRepository.save(admin)
				return admin
			}
			case 'INSTRUCTOR': {
				const instructor = await Instructor.create({
					input: { name: input.name, email: input.email, passwordHash: null },
					idGenerator: this.props.idGenerator,
				})
				await this.props.instructorRepository.save(instructor)
				return instructor
			}
			case 'STUDENT': {
				const student = await Student.create({
					input: { name: input.name, email: input.email, passwordHash: null },
					idGenerator: this.props.idGenerator,
				})
				await this.props.studentRepository.save(student)
				return student
			}
		}
	}

	private async issueTokens(
		user: { id: UniqueId; name: string; email: string },
		role: SocialLoginUseCaseRequest['role'],
		isNewUser: boolean
	): Promise<SocialLoginUseCaseResponse> {
		const accessToken = await this.props.jwtService.signAccessToken({
			sub: user.id,
			name: user.name,
			email: user.email,
			role,
		})

		const refreshToken = await this.props.tokenGenerator.generateRefreshToken()
		const refreshTokenHash =
			await this.props.tokenGenerator.hashRefreshToken(refreshToken)

		await this.props.refreshTokenRepository.save(
			user.id,
			refreshTokenHash,
			REFRESH_TOKEN_EXPIRY_SECONDS,
			role
		)

		return success({
			accessToken,
			refreshToken,
			user: { id: user.id, name: user.name, email: user.email, role },
			isNewUser,
		})
	}
}
