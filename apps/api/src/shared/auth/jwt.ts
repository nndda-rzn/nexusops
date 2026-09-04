import { env } from '@/shared/config/env'
import { generateId } from '@/shared/ids'
import type { JwtPayload, TokenPair } from './jwt.types'

// ─────────────────────────────────────────
// JWT utilities using Web Crypto API (built into Bun)
// ─────────────────────────────────────────

function base64url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let binary = ''
  // Use loop instead of spread to avoid stack overflow on large payloads
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlToBuffer(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
  const binary = atob(padded)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i)!
  }
  return buffer
}

async function getSigningKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(env.JWT_SECRET)
  return crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signJwt(
  payload: Omit<JwtPayload, 'jti' | 'iat' | 'exp'>
): Promise<TokenPair> {
  const key = await getSigningKey()
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = parseExpiry(env.JWT_ACCESS_EXPIRES_IN)

  const fullPayload: JwtPayload = {
    ...payload,
    jti: generateId(),
    iat: now,
    exp: now + expiresIn,
  }

  const header = { alg: 'HS256', typ: 'JWT' }
  const encoder = new TextEncoder()

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)).buffer as ArrayBuffer)
  const payloadB64 = base64url(encoder.encode(JSON.stringify(fullPayload)).buffer as ArrayBuffer)
  const signingInput = `${headerB64}.${payloadB64}`

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signingInput).buffer as ArrayBuffer
  )

  const token = `${signingInput}.${base64url(signature)}`

  return {
    accessToken: token,
    expiresIn,
  }
}

export async function verifyJwt(token: string): Promise<JwtPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string]
  const key = await getSigningKey()
  const encoder = new TextEncoder()

  const signingInput = `${headerB64}.${payloadB64}`
  const signature = base64urlToBuffer(signatureB64)

  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature,
    encoder.encode(signingInput).buffer as ArrayBuffer
  )

  if (!valid) {
    throw new Error('Invalid token signature')
  }

  const payload = JSON.parse(
    new TextDecoder().decode(base64urlToBuffer(payloadB64))
  ) as JwtPayload

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    throw new Error('Token expired')
  }

  return payload
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/)
  if (!match) return 3600

  const value = parseInt(match[1] ?? '1')
  const unit = match[2]

  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 3600
    case 'd': return value * 86400
    default: return 3600
  }
}
