import { createHash, randomBytes } from 'node:crypto'
import {
	decodeJwt,
	type JWSHeaderParameters,
	type JWTPayload,
	jwtVerify,
	SignJWT,
} from 'jose'
import { JwtService } from '../../application/jwt/jwt-service'
import { JwtTokenGenerator } from '../../application/jwt/jwt-token-generator'
import { getPrivateKey, getPublicKey } from './keys'

const ALG = 'RS256' satisfies JWSHeaderParameters['alg']
const ACCESS_TOKEN_EXPIRY = '10m' satisfies Parameters<
	SignJWT['setExpirationTime']
>[0]

type AccessTokenPayload = {
	sub: string
	name: string
	email: string
	role: string
}

export class TokenService implements JwtService, JwtTokenGenerator {
	async sign(payload: JWTPayload): Promise<string> {
		const privateKey = await getPrivateKey()
		return new SignJWT(payload)
			.setProtectedHeader({ alg: ALG })
			.setIssuedAt()
			.sign(privateKey)
	}

	async verify<T extends JWTPayload = JWTPayload>(token: string): Promise<T> {
		const publicKey = await getPublicKey()
		const { payload } = await jwtVerify(token, publicKey)
		return payload as T
	}

	async decode<T extends JWTPayload = JWTPayload>(token: string): Promise<T> {
		return decodeJwt(token) as T
	}

	async signAccessToken(payload: AccessTokenPayload): Promise<string> {
		const privateKey = await getPrivateKey()

		return new SignJWT({
			name: payload.name,
			email: payload.email,
			role: payload.role,
		})
			.setProtectedHeader({ alg: ALG, kid: 'default' })
			.setSubject(payload.sub)
			.setIssuedAt()
			.setExpirationTime(ACCESS_TOKEN_EXPIRY)
			.sign(privateKey)
	}

	async verifyAccessToken(token: string): Promise<JWTPayload | null> {
		try {
			const publicKey = await getPublicKey()
			const { payload } = await jwtVerify(token, publicKey)
			return payload
		} catch {
			return null
		}
	}

	async generateRefreshToken(): Promise<string> {
		return randomBytes(32).toString('hex')
	}

	async hashRefreshToken(token: string): Promise<string> {
		return createHash('sha256').update(token).digest('hex')
	}
}
