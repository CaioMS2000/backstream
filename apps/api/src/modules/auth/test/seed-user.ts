import { Email } from '@/shared/domain'
import { generateId } from '@/shared/infrastructure/id-generator'
import type { Role } from '../domain/role'
import { User } from '../domain/user'
import type { InMemoryUserRepository } from './in-memory-user-repository'

export async function seedUser(
	userRepo: InMemoryUserRepository,
	opts: { email: string; roles: Role[] }
): Promise<User> {
	const emailResult = Email.create(opts.email)
	if (emailResult.isFailure()) {
		throw new Error(`seed inválido: ${emailResult.value.message}`)
	}
	const user = User.create({
		id: await generateId(),
		email: emailResult.value,
		roles: opts.roles,
		now: new Date(),
	})
	userRepo.items.push(user)
	return user
}
