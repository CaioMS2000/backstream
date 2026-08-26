import { AggregateRoot, UniqueId } from '@backstream/core'
import { Phone, Username } from '@/shared/domain'
import { ProfileCreated } from './events/profile-created'
import { ProfileUpdated } from './events/profile-updated'

export type ProfileProps = {
	userId: UniqueId
	name: string
	username: Username
	phone: Phone | null
	avatarUrl: string | null
}

type CreateInput = ProfileProps & {
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
			username: input.username,
			phone: input.phone,
			avatarUrl: input.avatarUrl,
			userId: input.userId,
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

	get username(): Username {
		return this.props.username
	}

	get phone(): Phone | null {
		return this.props.phone
	}

	get avatarUrl(): string | null {
		return this.props.avatarUrl
	}

	get userId(): UniqueId {
		return this.props.userId
	}

	static __create(input: ProfileProps & { id: UniqueId }): Profile {
		return new Profile(input.id, input)
	}
}
