export abstract class JwtTokenGenerator {
	abstract generateRefreshToken(): Promise<string>
	abstract hashRefreshToken(token: string): Promise<string>
}
