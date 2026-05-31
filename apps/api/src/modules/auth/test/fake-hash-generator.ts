import { HashGenerator } from '../application/cryptography/hash-generator'

export class FakeHashGenerator extends HashGenerator {
	async hash(plain: string): Promise<string> {
		return `hashed:${plain}`
	}
}
