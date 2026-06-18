import { UniqueId } from '@backstream/core/unique-id'
import { UserNotFoundError } from '../application/@errors'
import { UserRepository } from '../application/repositories/user-repository'
import { User } from '../domain/user'

export class InMemoryUserRepository extends UserRepository {
	public items: User[] = []

	async insert(user: User): Promise<void> {
		this.items.push(user)
	}

	async update(user: User): Promise<void> {
		const index = this.items.findIndex(u => u.id === user.id)
		if (index < 0) {
			throw new UserNotFoundError()
		}
		this.items[index] = user
	}

	async findById(id: UniqueId): Promise<User | null> {
		return this.items.find(u => u.id === id) ?? null
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.items.find(u => u.email.value === email) ?? null
	}
}
