import { UniqueId } from '@backstream/core/unique-id'
import { describe, expect, it } from 'vitest'
import {
	type ProfileSummary,
	ProfileSummaryQuery,
} from '@/modules/profile/public/queries/profile-summary-query'
import { ProfileSummaryComposer } from './profile-summary-composer'

class FakeProfileSummaryQuery extends ProfileSummaryQuery {
	constructor(private readonly summary: ProfileSummary | null) {
		super()
	}

	async findByUserId(_userId: UniqueId): Promise<ProfileSummary | null> {
		return this.summary
	}
}

const baseUser = {
	userId: 'user-1',
	email: 'caio@example.com',
	roles: ['donor'] as const,
}

describe('ProfileSummaryComposer', () => {
	it('compõe name, avatarUrl e profileCompleted sobre o usuário', async () => {
		const sut = new ProfileSummaryComposer(
			new FakeProfileSummaryQuery({
				name: 'Caio',
				phone: null,
				avatarUrl: 'https://cdn.example.com/a.png',
				profileCompleted: true,
			})
		)

		const result = await sut.compose(baseUser)

		expect(result).toEqual({
			userId: 'user-1',
			email: 'caio@example.com',
			roles: ['donor'],
			name: 'Caio',
			avatarUrl: 'https://cdn.example.com/a.png',
			profileCompleted: true,
		})
	})

	it('lança quando a query não encontra o profile (invariante)', async () => {
		const sut = new ProfileSummaryComposer(new FakeProfileSummaryQuery(null))

		await expect(sut.compose(baseUser)).rejects.toThrow(/invariant/i)
	})
})
