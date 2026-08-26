import { AggregateRoot } from '@backstream/core/aggregate-root'
import { UniqueId } from '@backstream/core/unique-id'
import { Slug } from '@/shared/domain'
import { PayoutChanged } from './events/payout-changed'
import { SlugChanged } from './events/slug-changed'
import { StreamerCreated } from './events/streamer-created'

export type StreamerProps = {
	userId: UniqueId
	displayName: string
	slug: Slug
	pixKey?: string
}

type CreateInput = StreamerProps & {
	id: UniqueId
	now: Date
}

export class Streamer extends AggregateRoot {
	private constructor(
		id: UniqueId,
		public props: StreamerProps
	) {
		super(id)
	}

	get userId() {
		return this.props.userId
	}

	get displayName() {
		return this.props.displayName
	}

	get slug() {
		return this.props.slug
	}

	get pixKey() {
		return this.props.pixKey
	}

	static create(input: CreateInput): Streamer {
		const streamer = new Streamer(input.id, {
			userId: input.userId,
			displayName: input.displayName,
			slug: input.slug,
			pixKey: input.pixKey,
		})
		streamer.addEvent(
			new StreamerCreated(
				streamer.id,
				input.userId,
				input.slug.value,
				input.now
			)
		)
		return streamer
	}

	rename(displayName: string): void {
		if (displayName === this.displayName) return
		this.props.displayName = displayName
	}

	changeSlug(newSlug: string, now: Date): void {
		if (newSlug === this.slug.value) return
		const previousSlug = this.slug
		this.props.slug = Slug.createFromText(newSlug)
		this.addEvent(new SlugChanged(this.id, previousSlug.value, newSlug, now))
	}

	updatePixKey(newPixKey: string, now: Date): void {
		if (newPixKey === this.pixKey) return
		this.props.pixKey = newPixKey
		this.addEvent(new PayoutChanged(this.id, now))
	}

	canReceiveDonations(): boolean {
		return this.pixKey !== undefined && this.pixKey.length > 0
	}

	static __create(input: StreamerProps & { id: UniqueId }): Streamer {
		const streamer = new Streamer(input.id, {
			userId: input.userId,
			displayName: input.displayName,
			slug: input.slug,
			pixKey: input.pixKey,
		})

		return streamer
	}
}
