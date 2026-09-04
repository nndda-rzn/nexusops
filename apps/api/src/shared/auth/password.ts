// S-06 FIX: Replace npm 'argon2' package with Bun.password native API.
//
// Reasons:
// 1. 'argon2' npm uses node-gyp native addon — not fully compatible with Bun/JSC
// 2. Bun.password is built-in, zero-dependency, native performance
// 3. Hash output format (PHC string) is compatible — existing DB hashes still verifiable
//
// Bun.password docs: https://bun.sh/docs/api/hashing
// OWASP 2024 argon2id params: m=65536 (64 MiB), t=3, p=4
//
// NOTE: Bun.password.verify() argument order is (password, hash) NOT (hash, password)

/**
 * Hash a password using argon2id via Bun.password native API
 */
export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536,  // 64 MiB — OWASP minimum recommended
    timeCost: 3,        // 3 iterations
  })
}

/**
 * Verify a password against an argon2id hash
 * Compatible with hashes produced by the old 'argon2' npm package (PHC format)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash)
}
