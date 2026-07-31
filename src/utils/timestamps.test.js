import { describe, expect, it } from 'vitest'
import { normalizeTimestamp, normalizeTimestampRecord } from './timestamps.js'

describe('timestamp normalization', () => {
  it('accepts Date-safe positive numbers, numeric strings, and Date objects', () => {
    const timestamp = 1722470400000
    expect(normalizeTimestamp(timestamp)).toBe(timestamp)
    expect(normalizeTimestamp(String(timestamp))).toBe(timestamp)
    expect(normalizeTimestamp(new Date(timestamp))).toBe(timestamp)
  })

  it('rejects values that cannot be safely formatted by Date', () => {
    for (const value of [undefined, null, true, false, '', ' ', 0, -1, NaN, Infinity, 1e308]) {
      expect(normalizeTimestamp(value)).toBeUndefined()
    }
  })

  it('drops malformed records and keeps only valid timestamp entries', () => {
    expect(normalizeTimestampRecord({
      'EN-173': '1722470400000',
      'JP-1': 1e308,
      '': 1722470400000,
    })).toEqual(new Map([['EN-173', 1722470400000]]))
    expect(normalizeTimestampRecord([])).toEqual(new Map())
    expect(normalizeTimestampRecord(null)).toEqual(new Map())
  })
})
