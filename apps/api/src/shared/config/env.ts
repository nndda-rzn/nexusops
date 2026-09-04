import { z } from 'zod'

const envSchema = z.object({
  // Application
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:4000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Redis
  REDIS_URL: z.string().min(1),
  REDIS_PREFIX: z.string().default('nexusops'),

  // Storage
  STORAGE_ENDPOINT: z.string().min(1),
  STORAGE_ACCESS_KEY: z.string().min(1),
  STORAGE_SECRET_KEY: z.string().min(1),
  STORAGE_USE_SSL: z.coerce.boolean().default(false),
  STORAGE_BUCKET_PREFIX: z.string().default('nexusops'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_DEFAULT: z.coerce.number().default(100),
  RATE_LIMIT_AUTH: z.coerce.number().default(20),
  RATE_LIMIT_OPTIMIZATION: z.coerce.number().default(10),
  RATE_LIMIT_EXPORT: z.coerce.number().default(5),
  RATE_LIMIT_UPLOAD: z.coerce.number().default(20),

  // Compute
  COMPUTE_STREAM_PREFIX: z.string().default('nexusops:jobs'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
export type Env = typeof env
