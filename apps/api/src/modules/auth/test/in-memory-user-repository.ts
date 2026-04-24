import { UniqueId } from '@backstream/core/unique-id'
import { UserRepository } from '../application/repositories/user-repository'
import { User } from '../domain/user'

export class InMemoryUserRepository extends UserRepository {
	public items: User[] = []

	async save(user: User): Promise<void> {
		const index = this.items.findIndex(u => u.id === user.id)
		if (index >= 0) {
			this.items[index] = user
		} else {
			this.items.push(user)
		}
	}

	async findById(id: UniqueId): Promise<User | null> {
		return this.items.find(u => u.id === id) ?? null
	}

	async findByEmail(email: string): Promise<User | null> {
		return this.items.find(u => u.email.value === email) ?? null
	}

	async findByPhone(phone: string): Promise<User | null> {
		return this.items.find(u => u.phone?.value === phone) ?? null
	}
}
