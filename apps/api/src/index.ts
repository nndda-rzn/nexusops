import { createApp } from '@/bootstrap/app'
import { registerEventSubscribers } from '@/bootstrap/event-subscribers'
import { startOutboxProcessor } from '@/shared/outbox/optimization-outbox.processor'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

const app = createApp()

// Register domain event subscribers (L-02 fix: intervention execution)
registerEventSubscribers()

// Start transactional outbox processor (Phase 4A: job dispatch to Redis Streams)
startOutboxProcessor()

app.listen(env.APP_PORT, () => {
  logger.info('NexusOps API started', {
    port: env.APP_PORT,
    env: env.APP_ENV,
    swagger: `http://localhost:${env.APP_PORT}/swagger`,
  })
})

export type App = typeof app
