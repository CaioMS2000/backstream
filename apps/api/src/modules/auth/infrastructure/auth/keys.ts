import {
	type CryptoKey,
	exportJWK,
	importPKCS8,
	importSPKI,
	type JWK,
} from 'jose'
import { env } from '@/config/env'
import type { Algorithm } from '../../application/jwt'

const ALG = 'RS256' satisfies Algorithm

let privateKey: CryptoKey | null = null
let publicKey: CryptoKey | null = null
let jwks: { keys: JWK[] } | null = null

function decodePem(base64: string): string {
	return Buffer.from(base64, 'base64').toString('utf-8')
}

export async function getPrivateKey(): Promise<CryptoKey> {
	if (!privateKey) {
		privateKey = await importPKCS8(decodePem(env.JWT_PRIVATE_KEY), ALG)
	}
	return privateKey
}

export async function getPublicKey(): Promise<CryptoKey> {
	if (!publicKey) {
		publicKey = await importSPKI(decodePem(env.JWT_PUBLIC_KEY), ALG)
	}
	return publicKey
}

export async function getJWKS(): Promise<{ keys: JWK[] }> {
	if (!jwks) {
		const pub = await getPublicKey()
		const jwk = await exportJWK(pub)
		jwk.alg = ALG
		jwk.use = 'sig'
		jwk.kid = 'default'
		jwks = { keys: [jwk] }
	}
	return jwks
}
