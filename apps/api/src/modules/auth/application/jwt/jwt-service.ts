import type { JWTPayload } from 'jose'

export abstract class JwtService {
	abstract sign(payload: JWTPayload): Promise<string>
	abstract verify<T extends JWTPayload = JWTPayload>(token: string): Promise<T>
	abstract decode<T extends JWTPayload = JWTPayload>(token: string): Promise<T>
	abstract signAccessToken(payload: JWTPayload): Promise<string>
	abstract verifyAccessToken(token: string): Promise<JWTPayload | null>
}
