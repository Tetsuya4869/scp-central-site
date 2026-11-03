import { describe, expect, it } from 'vitest'
import { withCheckedValue } from './useChecklist.js'

describe('explicit checklist flag updates', () => {
  it('sets one flag idempotently and preserves unrelated/latest stored IDs', () => {
    const latest = new Set(['EN-173', 'JP-8'])
    const next = withCheckedValue(latest, ' JP-9 ', true)
    expect(next).toEqual(new Set(['EN-173', 'JP-8', 'JP-9']))
    expect(latest).toEqual(new Set(['EN-173', 'JP-8']))
    expect(withCheckedValue(next, 'JP-9', true)).toBe(next)
    expect(withCheckedValue(next, 'JP-9', false)).toEqual(latest)
    expect(withCheckedValue(latest, 'JP-9', false)).toBe(latest)
  })

  it('rejects invalid IDs and non-boolean values without changing flags', () => {
    const previous = new Set(['JP-8'])
    expect(withCheckedValue(previous, '', true)).toBe(previous)
    expect(withCheckedValue(previous, null, false)).toBe(previous)
    expect(withCheckedValue(previous, 'JP-8', 'false')).toBe(previous)
  })
})
