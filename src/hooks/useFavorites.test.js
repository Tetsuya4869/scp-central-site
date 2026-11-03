import { describe, expect, it } from 'vitest'
import { withFavoriteValue } from './useFavorites.js'

describe('explicit favorite flag updates', () => {
  it('restores a requested flag without toggling or deleting unrelated favorites', () => {
    const latest = new Set(['EN-173', 'JP-8'])
    const removed = withFavoriteValue(latest, ' EN-173 ', false)
    expect(removed).toEqual(new Set(['JP-8']))
    expect(latest).toEqual(new Set(['EN-173', 'JP-8']))
    expect(withFavoriteValue(removed, 'EN-173', false)).toBe(removed)
    expect(withFavoriteValue(removed, 'EN-173', true)).toEqual(latest)
    expect(withFavoriteValue(latest, 'EN-173', true)).toBe(latest)
  })

  it('ignores corrupt IDs and values without treating truthy strings as checked', () => {
    const previous = new Set(['EN-173'])
    expect(withFavoriteValue(previous, '  ', true)).toBe(previous)
    expect(withFavoriteValue(previous, 173, true)).toBe(previous)
    expect(withFavoriteValue(previous, 'EN-173', 'false')).toBe(previous)
  })
})
