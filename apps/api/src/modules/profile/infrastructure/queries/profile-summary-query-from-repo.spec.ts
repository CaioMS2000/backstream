import { UniqueId } from '@backstream/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { Phone } from '@/shared/domain'
import { Profile } from '../../domain/profile'
import { InMemoryProfileRepository } from '../../test/in-memory-profile-repository'
import { ProfileSummaryQueryFromRepo } from './profile-summary-query-from-repo'

describe('ProfileSummaryQueryFromRepo', () => {
	let profileRepo: InMemoryProfileRepository
	let sut: ProfileSummaryQueryFromRepo

	beforeEach(() => {
		profileRepo = new InMemoryProfileRepository()
		sut = new ProfileSummaryQueryFromRepo(profileRepo)
	})

	function seedProfile(opts: {
		userId: string
		name?: string
		phone?: string | null
	}): Profile {
		const phoneResult = Phone.createOptional(opts.phone ?? null)
		if (phoneResult.isFailure()) {
			throw new Error(`seed inválido: ${phoneResult.value.message}`)
		}

		const profile = Profile.__create({
			id: UniqueId(`profile-${opts.userId}`),
			userId: UniqueId(opts.userId),
			name: opts.name ?? 'Seeded Profile',
			phone: phoneResult.value,
			createdAt: new Date(),
			updatedAt: null,
		})

		profileRepo.profiles.push(profile)
		return profile
	}

	it('retorna profileCompleted false quando phone é null', async () => {
		seedProfile({ userId: 'user-1', phone: null })

		const summary = await sut.findByUserId(UniqueId('user-1'))

		expect(summary?.profileCompleted).toBe(false)
		expect(summary?.phone).toBeNull()
	})

	it('retorna profileCompleted true quando phone está preenchido', async () => {
		seedProfile({ userId: 'user-1', phone: '5511987654321' })

		const summary = await sut.findByUserId(UniqueId('user-1'))

		expect(summary?.profileCompleted).toBe(true)
		expect(summary?.phone).toBe('5511987654321')
	})

	it('retorna null quando o profile não existe', async () => {
		const summary = await sut.findByUserId(UniqueId('inexistente'))

		expect(summary).toBeNull()
	})

	it('repassa o name no summary', async () => {
		seedProfile({ userId: 'user-1', name: 'João Silva', phone: null })

		const summary = await sut.findByUserId(UniqueId('user-1'))

		expect(summary?.name).toBe('João Silva')
	})
})
