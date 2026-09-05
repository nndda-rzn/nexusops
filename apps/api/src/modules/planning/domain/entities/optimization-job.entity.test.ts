import { describe, test, expect } from 'bun:test'
import { OptimizationJob } from '@/modules/planning/domain/entities/optimization-job.entity'

function makeJob(overrides: Record<string, unknown> = {}) {
  return OptimizationJob.fromSnapshot({
    id: 'job_01',
    orgId: 'org_1',
    jobType: 'YARD_OPTIMIZATION',
    status: 'PENDING',
    input: { yard_id: 'yard_1' },
    retryCount: 0,
    maxRetries: 3,
    createdBy: 'user_1',
    createdAt: new Date(),
    ...overrides,
  })
}

describe('OptimizationJob state machine', () => {
  test('PENDING → QUEUED is allowed', () => {
    const job = makeJob()
    job.transition('QUEUED')
    expect(job.status).toBe('QUEUED')
    expect(job.toSnapshot().queuedAt).toBeInstanceOf(Date)
  })

  test('PENDING → RUNNING is rejected (must be QUEUED first)', () => {
    const job = makeJob()
    expect(() => job.transition('RUNNING')).toThrow(/Cannot transition/)
  })

  test('claim() moves QUEUED → RUNNING and stamps worker', () => {
    const job = makeJob({ status: 'QUEUED' })
    job.claim('worker-1')
    expect(job.status).toBe('RUNNING')
    expect(job.workerId).toBe('worker-1')
    expect(job.toSnapshot().claimedAt).toBeInstanceOf(Date)
    expect(job.toSnapshot().heartbeatAt).toBeInstanceOf(Date)
  })

  test('complete() from RUNNING stores result', () => {
    const job = makeJob({ status: 'RUNNING', workerId: 'worker-1' })
    job.complete({ status: 'OK' })
    expect(job.status).toBe('COMPLETED')
    expect(job.result).toEqual({ status: 'OK' })
    expect(job.toSnapshot().completedAt).toBeInstanceOf(Date)
  })

  test('COMPLETED is terminal — further transition rejected', () => {
    const job = makeJob({ status: 'COMPLETED' })
    expect(() => job.transition('FAILED')).toThrow(/Cannot transition/)
  })

  test('fail() with remaining retries stays FAILED (worker decides RETRYING in DB)', () => {
    const job = makeJob({ status: 'RUNNING' })
    job.fail('boom', 3)
    expect(job.status).toBe('FAILED')
    expect(job.retryCount).toBe(1)
    expect(job.error).toBe('boom')
  })

  test('FAILED → RETRYING → QUEUED is valid path', () => {
    const job = makeJob({ status: 'FAILED', retryCount: 1 })
    job.transition('RETRYING')
    expect(job.status).toBe('RETRYING')
    job.transition('QUEUED')
    expect(job.status).toBe('QUEUED')
  })

  test('FAILED → COMPLETED rejected', () => {
    const job = makeJob({ status: 'FAILED' })
    expect(() => job.transition('COMPLETED')).toThrow(/Cannot transition/)
  })

  test('CANCELLED from PENDING allowed', () => {
    const job = makeJob()
    job.transition('CANCELLED')
    expect(job.status).toBe('CANCELLED')
  })

  test('RUNNING → CANCELLED rejected', () => {
    const job = makeJob({ status: 'RUNNING' })
    expect(() => job.transition('CANCELLED')).toThrow(/Cannot transition/)
  })
})