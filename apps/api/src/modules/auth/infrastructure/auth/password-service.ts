import { hash, verify } from '@node-rs/argon2'
import { HashGenerator } from '../../application/cryptography/hash-generator'
import { HashVerifier } from '../../application/cryptography/hash-verifier'

// Algorithm.Argon2id = 2 (const enum, can't import at runtime with isolatedModules)
const ARGON2ID = 2

export class PasswordService implements HashVerifier, HashGenerator {
	async hash(password: string): Promise<string> {
		return hash(password, { algorithm: ARGON2ID })
	}

	async verify(hashed: string, password: string): Promise<boolean> {
		return verify(hashed, password)
	}
}
