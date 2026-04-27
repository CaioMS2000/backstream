import type { UniqueId } from '@backstream/core/unique-id'
import { StreamerRepository } from '../application/repositories/streamer-repository'
import type { Streamer } from '../domain/streamer'

export class InMemoryStreamerRepository extends StreamerRepository {
	public items: Streamer[] = []

	async save(streamer: Streamer): Promise<void> {
		const index = this.items.findIndex(s => s.id === streamer.id)
		if (index >= 0) {
			this.items[index] = streamer
		} else {
			this.items.push(streamer)
		}
	}

	async findByUserId(userId: UniqueId): Promise<Streamer | null> {
		return this.items.find(s => s.props.userId === userId) ?? null
	}

	async findBySlug(slug: string): Promise<Streamer | null> {
		return this.items.find(s => s.props.slug === slug) ?? null
	}
}
