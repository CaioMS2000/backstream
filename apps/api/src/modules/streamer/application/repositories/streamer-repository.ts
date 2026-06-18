import type { UniqueId } from '@backstream/core/unique-id'
import type { Streamer } from '../../domain/streamer'

export abstract class StreamerRepository {
	abstract insert(streamer: Streamer): Promise<void>
	abstract update(streamer: Streamer): Promise<void>
	abstract findByUserId(userId: UniqueId): Promise<Streamer | null>
	abstract findBySlug(slug: string): Promise<Streamer | null>
}
