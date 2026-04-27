import { AggregateRoot } from '@backstream/core/aggregate-root'
import { UniqueId } from '@backstream/core/unique-id'
import { generateId } from '@/shared/infrastructure/id-generator'
import { StreamerCreated } from './events/streamer-created'

export type StreamerProps = {
	userId: UniqueId
	displayName: string
	slug: string
	pixKey: string
}

export class Streamer extends AggregateRoot {
	private constructor(
		id: UniqueId,
		public props: StreamerProps,
		readonly createdAt: Date
	) {
		super(id)
	}

	static async create(input: {
		userId: UniqueId
		displayName: string
		slug: string
		pixKey: string
		now: Date
	}): Promise<Streamer> {
		const streamer = new Streamer(
			await generateId(),
			{
				userId: input.userId,
				displayName: input.displayName,
				slug: input.slug,
				pixKey: input.pixKey,
			},
			input.now
		)
		streamer.addEvent(
			new StreamerCreated(streamer.id, input.userId, input.slug, input.now)
		)
		return streamer
	}
}
