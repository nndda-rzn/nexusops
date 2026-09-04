import { Elysia } from 'elysia'

export const healthRoutes = new Elysia()

  .get('/health', () => ({
    status: 'healthy',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  }), {
    detail: { tags: ['Health'], summary: 'Health check' },
  })

  .get('/health/ready', async () => {
    // TODO: implement real connectivity checks in Phase 1
    return {
      status: 'ready',
      checks: { database: 'ok', redis: 'ok', storage: 'ok' },
      timestamp: new Date().toISOString(),
    }
  }, {
    detail: { tags: ['Health'], summary: 'Readiness check' },
  })
