import type { UniqueId } from '@backstream/core/unique-id'
import type { Slug } from '@/shared/domain'
import { StreamerNotFoundError } from '../application/@errors'
import { StreamerRepository } from '../application/repositories/streamer-repository'
import type { Streamer } from '../domain/streamer'

export class InMemoryStreamerRepository extends StreamerRepository {
	public items: Streamer[] = []

	async insert(streamer: Streamer): Promise<void> {
		this.items.push(streamer)
	}

	async update(streamer: Streamer): Promise<void> {
		const index = this.items.findIndex(s => s.id === streamer.id)
		if (index < 0) throw new StreamerNotFoundError()
		this.items[index] = streamer
	}

	async findByUserId(userId: UniqueId): Promise<Streamer | null> {
		return this.items.find(s => s.props.userId === userId) ?? null
	}

	async findBySlug(slug: Slug): Promise<Streamer | null> {
		return this.items.find(s => s.props.slug.equals(slug)) ?? null
	}
}
