/**
 * Parse JWT expiry string to seconds
 * e.g. '1h' -> 3600, '7d' -> 604800
 */
export function parseExpiry(expiry: string): number {
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
