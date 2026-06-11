import { failure, Result, success, UniqueId } from '@backstream/core'
import { Role } from '../../domain/role'
import { RoleNotSelfAssignableError } from '../@errors/role-not-self-assignable-error'
import { UserNotFoundError } from '../@errors/user-not-found-error'
import { UserRepository } from '../repositories/user-repository'

export type AddRoleUseCaseRequest = {
	userId: string
	role: Role
}

export type AddRoleUseCaseResponse = Result<
	UserNotFoundError | RoleNotSelfAssignableError,
	{ roles: Role[] }
>

type UseCaseProps = {
	userRepository: UserRepository
}

export class AddRoleUseCase {
	constructor(private props: UseCaseProps) {}

	async execute({
		userId,
		role,
	}: AddRoleUseCaseRequest): Promise<AddRoleUseCaseResponse> {
		// admin não é auto-gerenciável por esse fluxo self-service.
		if (role === 'admin') return failure(RoleNotSelfAssignableError)

		const user = await this.props.userRepository.findById(UniqueId(userId))

		if (!user) return failure(UserNotFoundError)

		user.addRole(role)
		await this.props.userRepository.save(user)

		return success({ roles: user.roles })
	}
}
