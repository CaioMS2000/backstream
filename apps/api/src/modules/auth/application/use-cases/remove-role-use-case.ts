import { failure, Result, success, UniqueId } from '@backstream/core'
import { Role } from '../../domain/role'
import { CannotRemoveLastRoleError } from '../@errors/cannot-remove-last-role-error'
import { RoleNotSelfAssignableError } from '../@errors/role-not-self-assignable-error'
import { UserNotFoundError } from '../@errors/user-not-found-error'
import { UserRepository } from '../repositories/user-repository'

export type RemoveRoleUseCaseRequest = {
	userId: string
	role: Role
}

export type RemoveRoleUseCaseResponse = Result<
	UserNotFoundError | RoleNotSelfAssignableError | CannotRemoveLastRoleError,
	{ roles: Role[] }
>

type UseCaseProps = {
	userRepository: UserRepository
}

export class RemoveRoleUseCase {
	constructor(private props: UseCaseProps) {}

	async execute({
		userId,
		role,
	}: RemoveRoleUseCaseRequest): Promise<RemoveRoleUseCaseResponse> {
		// admin não é auto-gerenciável por esse fluxo self-service.
		if (role === 'admin') return failure(RoleNotSelfAssignableError)

		const user = await this.props.userRepository.findById(UniqueId(userId))

		if (!user) return failure(UserNotFoundError)

		// Remover a única role deixaria o usuário sem nenhuma — bloqueia.
		if (user.hasRole(role) && user.roles.length === 1) {
			return failure(CannotRemoveLastRoleError)
		}

		user.removeRole(role)
		await this.props.userRepository.save(user)

		return success({ roles: user.roles })
	}
}
