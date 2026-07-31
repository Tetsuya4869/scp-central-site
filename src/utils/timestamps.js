/**
 * Convert persisted or caller-provided values into a timestamp that the
 * JavaScript Date API can safely format. Numeric strings are accepted for
 * compatibility with older backups; booleans and empty strings are not.
 */
export function normalizeTimestamp(value) {
  let timestamp

  if (value instanceof Date) {
    timestamp = value.getTime()
  } else if (typeof value === 'number') {
    timestamp = value
  } else if (typeof value === 'string' && value.trim()) {
    timestamp = Number(value)
  } else {
    return undefined
  }

  if (!Number.isSafeInteger(timestamp) || timestamp <= 0 || timestamp > MAX_DATE_TIMESTAMP) return undefined
  return timestamp
}

/**
 * Normalize the JSON object used by scp-readdates-v1 into a Map. Invalid
 * records, empty IDs, and values outside Date's supported range are dropped.
 */
export function normalizeTimestampRecord(value) {
  const result = new Map()
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return result

  for (const [id, rawTimestamp] of Object.entries(value)) {
    if (!id) continue
    const timestamp = normalizeTimestamp(rawTimestamp)
    if (timestamp !== undefined) result.set(id, timestamp)
  }
  return result
}
export const MAX_DATE_TIMESTAMP = 8_640_000_000_000_000
