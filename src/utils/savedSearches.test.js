import { describe, expect, it } from 'vitest'
import {
  SAVED_SEARCH_STORAGE_KEY, MAX_SAVED_SEARCHES, normalizeSearchFilters,
  normalizeSavedSearches, addSavedSearch, readSavedSearches, writeSavedSearches,
} from './savedSearches.js'

const filters = {
  query: ' 未読 office ', branchCode: 'JP', seriesId: '2', readFilter: 'unread',
  favoritesOnly: true, sortBy: 'rating-desc',
}
const preset = (id = 'stable-1', name = 'お気に入りの未読') => ({ id, name, filters: { ...filters } })

function storage(initial) {
  const values = new Map(initial ? [[SAVED_SEARCH_STORAGE_KEY, JSON.stringify(initial)]] : [])
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

describe('saved search backup normalization', () => {
  it('round trips exact conditions without copying reading flags, records, or a page', () => {
    const source = [{ ...preset(), filters: { ...filters, page: 9, checked: ['EN-173'], article: { id: 'EN-173' } }, extra: 'ignored' }]
    const result = normalizeSavedSearches(source)
    expect(result).toEqual([preset()])
    expect(source[0].filters.page).toBe(9)
    expect(normalizeSavedSearches(JSON.parse(JSON.stringify(result)))).toEqual(result)
  })

  it('validates branch/series relationships and filter enums, including custom series IDs', () => {
    expect(normalizeSearchFilters({ branchCode: 'jp', seriesId: 'tales-jp' })).toMatchObject({ branchCode: 'JP', seriesId: 'tales-jp' })
    expect(normalizeSearchFilters({ branchCode: 'JP', seriesId: 2 })).toMatchObject({ branchCode: 'JP', seriesId: '2' })
    expect(normalizeSearchFilters({ branchCode: 'JP', seriesId: 'en-joke', readFilter: 'bad', sortBy: 'bad', favoritesOnly: 'true' })).toMatchObject({ branchCode: 'JP', seriesId: '', readFilter: 'all', sortBy: 'number-asc', favoritesOnly: false })
    expect(normalizeSearchFilters({ branchCode: 'XX', seriesId: '1' })).toMatchObject({ branchCode: '', seriesId: '' })
    expect(normalizeSearchFilters({ branchCode: '', seriesId: '1' })).toMatchObject({ branchCode: '', seriesId: '' })
    expect(normalizeSearchFilters({ query: 12, branchCode: {}, seriesId: {} }).query).toBe('')
  })

  it('drops malformed entries, deduplicates IDs, and preserves the first five stable identities', () => {
    const entries = [null, {}, { ...preset('bad'), filters: [] }, preset(), preset('stable-1', 'duplicate'), ...Array.from({ length: 7 }, (_, i) => preset(`next-${i}`, `条件${i}`))]
    expect(normalizeSavedSearches(entries).map(item => item.id)).toEqual(['stable-1', 'next-0', 'next-1', 'next-2', 'next-3'])
    expect(normalizeSavedSearches({})).toEqual([])
    expect(normalizeSavedSearches([{ ...preset(), name: '   ' }])).toEqual([])
    expect(normalizeSavedSearches([{ ...preset(), id: '   ' }])).toEqual([])
    expect(normalizeSavedSearches([{ ...preset(), name: 'x'.repeat(80) }])[0].name).toHaveLength(60)
  })
})

describe('saved search persistence', () => {
  it('keeps stable IDs and exact filters across independent writes and reads', () => {
    const memory = storage()
    expect(readSavedSearches(memory)).toEqual([])
    const written = writeSavedSearches(memory, [preset()])
    expect(readSavedSearches(memory)).toEqual(written)
    expect(readSavedSearches(memory)[0]).toEqual(preset())
  })

  it('enforces capacity and duplicate names without modifying saved conditions', () => {
    const full = Array.from({ length: MAX_SAVED_SEARCHES }, (_, i) => preset(`id-${i}`, `条件${i}`))
    expect(() => addSavedSearch(full, preset('overflow', '追加'))).toThrow('5件まで')
    expect(full).toHaveLength(MAX_SAVED_SEARCHES)
    expect(() => addSavedSearch([preset()], preset('another-id'))).toThrow('同じ名前')
    expect(addSavedSearch([preset()], preset('another-id', '別の条件'))).toHaveLength(2)
  })

  it('surfaces unavailable storage, invalid JSON and write failures rather than reporting success', () => {
    expect(() => readSavedSearches(null)).toThrow()
    expect(() => readSavedSearches({ getItem: () => '{bad json' })).toThrow()
    const failing = { getItem: () => JSON.stringify([preset()]), setItem: () => { throw new Error('quota exceeded') } }
    expect(() => writeSavedSearches(failing, [preset('new', '追加')])).toThrow('quota exceeded')
    expect(readSavedSearches(failing)).toEqual([preset()])
  })
})
