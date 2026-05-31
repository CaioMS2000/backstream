import { JwtTokenGenerator } from '../application/jwt/jwt-token-generator'

export class FakeJwtTokenGenerator extends JwtTokenGenerator {
	async generateRefreshToken(): Promise<string> {
		return 'fake-refresh-token'
	}
	async hashRefreshToken(): Promise<string> {
		return 'fake-refresh-token-hash'
	}
}
