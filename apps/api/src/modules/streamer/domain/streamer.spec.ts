import { UniqueId } from '@backstream/core/unique-id'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Slug } from '@/shared/domain'
import {
	__resetClockForTests,
	initializeClock,
} from '@/shared/infrastructure/clock'
import {
	__resetIdGeneratorForTests,
	initializeIdGenerator,
} from '@/shared/infrastructure/id-generator'
import { PayoutChanged } from './events/payout-changed'
import { SlugChanged } from './events/slug-changed'
import { StreamerCreated } from './events/streamer-created'
import { Streamer } from './streamer'

async function makeStreamer(pixKey?: string): Promise<Streamer> {
	return Streamer.create({
		userId: UniqueId('user-1'),
		displayName: 'Caio',
		slug: Slug.create('caio'),
		pixKey,
	})
}

describe('Streamer aggregate', () => {
	beforeEach(() => {
		initializeClock()
		initializeIdGenerator('v4')
	})

	afterEach(() => {
		__resetClockForTests()
		__resetIdGeneratorForTests()
	})

	describe('create', () => {
		it('emite StreamerCreated no factory', async () => {
			const streamer = await makeStreamer()
			expect(streamer.events).toHaveLength(1)
			expect(streamer.events[0]).toBeInstanceOf(StreamerCreated)
		})
	})

	describe('rename', () => {
		it('atualiza displayName e não emite evento adicional', async () => {
			const streamer = await makeStreamer()

			streamer.rename('Caio Marques')

			expect(streamer.props.displayName).toBe('Caio Marques')
			expect(streamer.events).toHaveLength(1) // só o StreamerCreated da factory
		})

		it('é no-op quando o displayName é igual', async () => {
			const streamer = await makeStreamer()

			streamer.rename('Caio')

			expect(streamer.props.displayName).toBe('Caio')
			expect(streamer.events).toHaveLength(1)
		})
	})

	describe('changeSlug', () => {
		it('atualiza slug e emite SlugChanged com valores antigo e novo', async () => {
			const streamer = await makeStreamer()

			streamer.changeSlug('novo-slug')

			expect(streamer.props.slug.value).toBe('novo-slug')
			expect(streamer.events).toHaveLength(2)
			const event = streamer.events[1] as SlugChanged
			expect(event).toBeInstanceOf(SlugChanged)
			expect(event.previousSlug).toBe('caio')
			expect(event.newSlug).toBe('novo-slug')
		})

		it('é no-op quando o slug é igual', async () => {
			const streamer = await makeStreamer()

			streamer.changeSlug('caio')

			expect(streamer.events).toHaveLength(1)
		})
	})

	describe('updatePixKey', () => {
		it('atualiza pixKey e emite PayoutChanged', async () => {
			const streamer = await makeStreamer()

			streamer.updatePixKey('caio@pix.com')

			expect(streamer.props.pixKey).toBe('caio@pix.com')
			expect(streamer.events).toHaveLength(2)
			expect(streamer.events[1]).toBeInstanceOf(PayoutChanged)
		})

		it('é no-op quando o pixKey é igual', async () => {
			const streamer = await makeStreamer('caio@pix.com')

			streamer.updatePixKey('caio@pix.com')

			expect(streamer.events).toHaveLength(1)
		})
	})

	describe('canReceiveDonations', () => {
		it('retorna false quando pixKey não foi configurado', async () => {
			const streamer = await makeStreamer()
			expect(streamer.canReceiveDonations()).toBe(false)
		})

		it('retorna false quando pixKey é string vazia', async () => {
			const streamer = await makeStreamer('')
			expect(streamer.canReceiveDonations()).toBe(false)
		})

		it('retorna true quando pixKey está preenchido', async () => {
			const streamer = await makeStreamer('caio@pix.com')
			expect(streamer.canReceiveDonations()).toBe(true)
		})
	})
})
