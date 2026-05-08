export const OAuthProvider = ['google'] as const
export type OAuthProvider = (typeof OAuthProvider)[number]

export type OAuthUserProfile = {
	providerAccountId: string
	email: string
	name: string
}
