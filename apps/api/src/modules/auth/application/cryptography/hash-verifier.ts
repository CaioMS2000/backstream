export abstract class HashVerifier {
	abstract verify(hashed: string, password: string): Promise<boolean>
}
