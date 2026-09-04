import { defineConfig } from 'drizzle-kit'
import { env } from './src/shared/config/env'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/database/schema/*',
  out: './src/shared/database/migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
})
