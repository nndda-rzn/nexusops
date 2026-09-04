import { Redis } from 'ioredis'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

// ─────────────────────────────────────────
// Redis client singleton
// ─────────────────────────────────────────

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      keyPrefix: `${env.REDIS_PREFIX}:`,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    })

    _redis.on('error', (err) => {
      logger.error('Redis error', { error: err.message })
    })

    _redis.on('connect', () => {
      logger.info('Redis connected')
    })
  }
  return _redis
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit()
    _redis = null
    logger.info('Redis connection closed')
  }
}

// ─────────────────────────────────────────
// Key helpers
// ─────────────────────────────────────────

export const RedisKeys = {
  // JWT blacklist — stores revoked JTIs until expiry
  jwtBlacklist: (jti: string) => `blacklist:${jti}`,

  // Rate limiting
  rateLimit: (key: string, endpoint: string) => `ratelimit:${endpoint}:${key}`,

  // Idempotency keys
  idempotency: (key: string) => `idempotency:${key}`,

  // Cache
  cache: (domain: string, id: string) => `cache:${domain}:${id}`,

  // Session
  session: (sessionId: string) => `session:${sessionId}`,

  // Job streams
  jobStream: (jobType: string) => `jobs:${jobType}`,
  deadLetter: () => `jobs:dead_letter`,
} as const
