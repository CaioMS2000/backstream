import { AggregateRoot, UniqueId } from '@backstream/core'
import { Phone } from '@/shared/domain'
import { ProfileCreated } from './events/profile-created'
import { ProfileUpdated } from './events/profile-updated'

export type ProfileProps = {
	userId: UniqueId
	name: string
	phone: Phone | null
	createdAt: Date
	updatedAt: Date | null
}

type CreateInput = Omit<ProfileProps, 'createdAt' | 'updatedAt'> & {
	id: UniqueId
	now: Date
}

export class Profile extends AggregateRoot {
	private constructor(
		id: UniqueId,
		private readonly props: ProfileProps
	) {
		super(id)
	}

	static create(input: CreateInput): Profile {
		const profile = new Profile(input.id, {
			name: input.name,
			phone: input.phone,
			userId: input.userId,
			createdAt: input.now,
			updatedAt: null,
		})

		profile.addEvent(
			new ProfileCreated(
				profile.id,
				input.userId,
				input.name,
				input.phone ? input.phone.value : null,
				input.now
			)
		)

		return profile
	}

	updateDetails(input: { name: string; phone: Phone | null; now: Date }): void {
		this.props.name = input.name
		this.props.phone = input.phone
		this.props.updatedAt = input.now

		this.addEvent(
			new ProfileUpdated(
				this.id,
				this.userId,
				input.name,
				input.phone ? input.phone.value : null,
				input.now
			)
		)
	}

	isCompleted(): boolean {
		return !!this.props.phone
	}

	get name(): string {
		return this.props.name
	}

	get phone(): Phone | null {
		return this.props.phone
	}

	get userId(): UniqueId {
		return this.props.userId
	}

	get createdAt(): Date {
		return this.props.createdAt
	}

	get updatedAt(): Date | null {
		return this.props.updatedAt
	}

	static __create(input: ProfileProps & { id: UniqueId }): Profile {
		return new Profile(input.id, input)
	}
}
