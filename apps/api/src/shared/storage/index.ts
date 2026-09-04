import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/shared/config/env'
import { logger } from '@/shared/logging'

// ─────────────────────────────────────────
// MinIO / S3 client
// ─────────────────────────────────────────

let _client: S3Client | null = null

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      endpoint: env.STORAGE_USE_SSL
        ? `https://${env.STORAGE_ENDPOINT}`
        : `http://${env.STORAGE_ENDPOINT}`,
      region: 'us-east-1',  // required but ignored by MinIO
      credentials: {
        accessKeyId: env.STORAGE_ACCESS_KEY,
        secretAccessKey: env.STORAGE_SECRET_KEY,
      },
      forcePathStyle: true,  // required for MinIO
    })
  }
  return _client
}

// ─────────────────────────────────────────
// Bucket names
// ─────────────────────────────────────────

export const Buckets = {
  documents: `${env.STORAGE_BUCKET_PREFIX}-documents`,
  photos: `${env.STORAGE_BUCKET_PREFIX}-photos`,
  reports: `${env.STORAGE_BUCKET_PREFIX}-reports`,
  exports: `${env.STORAGE_BUCKET_PREFIX}-exports`,
  attachments: `${env.STORAGE_BUCKET_PREFIX}-attachments`,
  temp: `${env.STORAGE_BUCKET_PREFIX}-temp`,
} as const

export type BucketName = keyof typeof Buckets

// ─────────────────────────────────────────
// Upload file
// ─────────────────────────────────────────

export interface UploadParams {
  bucket: BucketName
  key: string
  body: Buffer | Uint8Array | ReadableStream
  contentType: string
  metadata?: Record<string, string>
}

export async function uploadFile(params: UploadParams): Promise<string> {
  const client = getClient()
  const bucketName = Buckets[params.bucket]

  await client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
    Metadata: params.metadata,
  }))

  logger.info('File uploaded', { bucket: bucketName, key: params.key })

  return params.key
}

// ─────────────────────────────────────────
// Generate presigned URL for download
// ─────────────────────────────────────────

export async function getPresignedUrl(
  bucket: BucketName,
  key: string,
  expiresInSeconds = 900  // 15 minutes default
): Promise<string> {
  const client = getClient()

  const command = new GetObjectCommand({
    Bucket: Buckets[bucket],
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

// ─────────────────────────────────────────
// Delete file
// ─────────────────────────────────────────

export async function deleteFile(bucket: BucketName, key: string): Promise<void> {
  const client = getClient()

  await client.send(new DeleteObjectCommand({
    Bucket: Buckets[bucket],
    Key: key,
  }))

  logger.info('File deleted', { bucket: Buckets[bucket], key })
}

// ─────────────────────────────────────────
// Build object key with org prefix
// Ensures org isolation in object storage
// ─────────────────────────────────────────

export function buildObjectKey(
  orgId: string,
  domain: string,
  filename: string
): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${orgId}/${domain}/${year}/${month}/${filename}`
}
