import {
	failure,
	type IdGenerator,
	type Result,
	success,
	type UniqueId,
	UseCase,
} from '@repo/core'
import { EmailAlreadyRegisteredError } from '../../@errors'
import type { AdminRepository } from '../../repositories/admin-repository'
import type { InstructorRepository } from '../../repositories/instructor-repository'
import type { StudentRepository } from '../../repositories/student-repository'
import type { HashGenerator } from '../../cryptography/hash-generator'
import { Admin } from '../../../models/admin'
import { Instructor } from '../../../models/instructor'
import { Student } from '../../../models/student'
import type { HTTPUser } from '../../../models/http-user'

export type RegisterUseCaseRequest = {
	name: string
	email: string
	password: string
	phone: string
	role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
}

export type RegisterUseCaseResponse = Result<
	EmailAlreadyRegisteredError,
	{
		user: HTTPUser
	}
>

type UseCaseProps = {
	adminRepository: AdminRepository
	instructorRepository: InstructorRepository
	studentRepository: StudentRepository
	hashGenerator: HashGenerator
	idGenerator: IdGenerator
}

type PrivateMethodsParams = Omit<
	RegisterUseCaseRequest,
	'role' | 'password'
> & { passwordHash: string }

export class RegisterUseCase extends UseCase<
	RegisterUseCaseRequest,
	RegisterUseCaseResponse,
	UseCaseProps
> {
	constructor(protected override props: UseCaseProps) {
		super()
	}

	async execute(
		input: RegisterUseCaseRequest
	): Promise<RegisterUseCaseResponse> {
		const emails = []
		let [admin, instructor, student] = await Promise.all([
			this.props.adminRepository.findByEmail(input.email),
			this.props.instructorRepository.findByEmail(input.email),
			this.props.studentRepository.findByEmail(input.email),
		])

		emails.push(admin?.email)
		emails.push(instructor?.email)
		emails.push(student?.email)

		const emailExists = emails.includes(input.email)

		if (emailExists) {
			return failure(EmailAlreadyRegisteredError)
		}

		let id: UniqueId
		const passwordHash = await this.props.hashGenerator.hash(input.password)

		switch (input.role) {
			case 'ADMIN': {
				admin = await this.registerAdmin({ ...input, passwordHash })
				id = admin.id
				break
			}
			case 'INSTRUCTOR': {
				instructor = await this.registerInstructor({ ...input, passwordHash })
				id = instructor.id
				break
			}
			case 'STUDENT': {
				student = await this.registerStudent({ ...input, passwordHash })
				id = student.id
				break
			}
		}

		return success({
			user: { id, name: input.name, email: input.email, role: input.role },
		})
	}

	private async registerAdmin(data: PrivateMethodsParams): Promise<Admin> {
		const admin = await Admin.create({
			input: data,
			idGenerator: this.props.idGenerator,
		})

		await this.props.adminRepository.save(admin)

		return admin
	}

	private async registerInstructor(
		data: PrivateMethodsParams
	): Promise<Instructor> {
		const instructor = await Instructor.create({
			input: data,
			idGenerator: this.props.idGenerator,
		})

		await this.props.instructorRepository.save(instructor)

		return instructor
	}

	private async registerStudent(data: PrivateMethodsParams): Promise<Student> {
		const student = await Student.create({
			input: data,
			idGenerator: this.props.idGenerator,
		})

		await this.props.studentRepository.save(student)

		return student
	}
}
