import { describe, expect, it } from 'vitest'
import { normalizeQueue } from './useQueue.js'

describe('normalizeQueue', () => {
  it('removes malformed, blank, and duplicate queue entries while preserving order', () => {
    expect(normalizeQueue([
      'EN-173',
      'EN-173',
      '',
      '  ',
      null,
      173,
      ' JP-001 ',
      'JP-001',
    ])).toEqual(['EN-173', 'JP-001'])
  })

  it('returns an empty queue for corrupted non-array storage values', () => {
    expect(normalizeQueue(null)).toEqual([])
    expect(normalizeQueue({ id: 'EN-173' })).toEqual([])
  })
})
