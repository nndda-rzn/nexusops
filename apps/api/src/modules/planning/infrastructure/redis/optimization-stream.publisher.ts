import { getRedis } from '@/shared/redis'
import { logger } from '@/shared/logging'

export const JOB_STREAM_MESSAGE_VERSION = '1'

export interface PublishJobMessage {
  jobId: string
  orgId: string
  jobType: string
  attempt: number
  payload: unknown
  requestedBy?: string | undefined
}

// Stream name: nexusops:<REDIS_PREFIX>:jobs:<job_type>
// Python worker uses settings.redis_stream_prefix = "nexusops:jobs" and joins
// the same job_type suffix — contract must stay in sync (see compute/src/shared/config.py).
export function jobStreamName(jobType: string): string {
  return `jobs:${jobType.toLowerCase()}`
}

export async function publishJobToStream(msg: PublishJobMessage): Promise<void> {
  const redis = getRedis()
  const stream = jobStreamName(msg.jobType)
  const fields: Array<string | number | Buffer> = [
    'message_version', JOB_STREAM_MESSAGE_VERSION,
    'job_id', msg.jobId,
    'org_id', msg.orgId,
    'job_type', msg.jobType,
    'attempt', String(msg.attempt),
    'requested_by', msg.requestedBy ?? '',
    'payload', JSON.stringify(msg.payload),
  ]
  await redis.xadd(stream, '*', ...fields)
  logger.info('Optimization job published to stream', { stream, job_id: msg.jobId })
}