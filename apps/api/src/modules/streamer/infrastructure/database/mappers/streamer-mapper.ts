import { UniqueId } from '@backstream/core/unique-id'
import { Streamer } from '@/modules/streamer/domain/streamer'
import { Slug } from '@/shared/domain'
import { StreamerDrizzleModel } from '../schemas'

export class StreamerMapper {
	static toDomain(record: StreamerDrizzleModel): Streamer {
		return Streamer.__create({
			id: UniqueId(record.id),
			userId: UniqueId(record.userId),
			displayName: record.displayName,
			slug: Slug.create(record.slug),
			pixKey: record.pixKey ?? undefined,
		})
	}
}
