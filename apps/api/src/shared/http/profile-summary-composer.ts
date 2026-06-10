import { UniqueId } from '@backstream/core/unique-id'
import type { ProfileSummaryQuery } from '@/modules/profile/public/queries/profile-summary-query'

type WithProfileFields<T> = T & {
	name: string
	avatarUrl: string | null
	profileCompleted: boolean
}

/**
 * Compõe os campos de `ProfileSummary` (name, avatarUrl, profileCompleted) sobre
 * um usuário já autenticado, pra resposta HTTP de login/register/me.
 *
 * Leitura cross-módulo via query port injetado (auth não conhece profile
 * internamente). Ver docs/adr/0002-leitura-cross-modulo-via-query-port.md
 *
 * Pós REF-04 todo usuário tem profile; ausência aqui é violação de invariante
 * → lança (fail-loud), não há fallback.
 */
export class ProfileSummaryComposer {
	constructor(private readonly profileSummary: ProfileSummaryQuery) {}

	async compose<T extends { userId: string }>(
		user: T
	): Promise<WithProfileFields<T>> {
		const summary = await this.profileSummary.findByUserId(
			UniqueId(user.userId)
		)

		if (!summary) {
			throw new Error(
				`[invariant] ProfileSummary ausente para o usuário ${user.userId}`
			)
		}

		return {
			...user,
			name: summary.name,
			avatarUrl: summary.avatarUrl,
			profileCompleted: summary.profileCompleted,
		}
	}
}
