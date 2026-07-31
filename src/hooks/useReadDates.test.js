import { describe, expect, it } from 'vitest'
import { mergeReadDates, removeReadDates } from './useReadDates.js'

describe('read-date batch updates', () => {
  it('timestamps only newly read IDs by default without mutating prior history', () => {
    const previous = new Map([['EN-173', 100]])
    const next = mergeReadDates(previous, ['EN-173', 'EN-682', 'EN-682'], 200)

    expect(next).not.toBe(previous)
    expect(previous).toEqual(new Map([['EN-173', 100]]))
    expect(next).toEqual(new Map([
      ['EN-173', 100],
      ['EN-682', 200],
    ]))
  })

  it('can explicitly overwrite dates and returns the same map for a no-op', () => {
    const previous = new Map([['EN-173', 100]])
    expect(mergeReadDates(previous, ['EN-173'], 200, { overwriteExisting: true }))
      .toEqual(new Map([['EN-173', 200]]))
    expect(mergeReadDates(previous, ['EN-173'], 200)).toBe(previous)
  })

  it('deletes many dates in one immutable operation', () => {
    const previous = new Map([
      ['EN-173', 100],
      ['EN-682', 200],
    ])
    const next = removeReadDates(previous, ['EN-173', 'missing'])
    expect(next).toEqual(new Map([['EN-682', 200]]))
    expect(previous.size).toBe(2)
  })

  it('rejects timestamps outside the JavaScript Date range', () => {
    const previous = new Map([['EN-173', 100]])

    expect(mergeReadDates(previous, ['JP-1'], 1e308)).toBe(previous)
    expect(mergeReadDates(previous, ['JP-1'], 0)).toBe(previous)
  })
})
