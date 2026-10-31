import { describe, expect, it } from 'vitest'
import { CATALOG_INDEX, CATALOG_SIZE } from './catalog.js'
import { buildExploreIndex, queryExploreIndex } from './exploreSearch.js'

const emptyIndex = buildExploreIndex()
const ids = records => records.map(record => record.id)
const subset = (...articleIds) => emptyIndex.filter(record => articleIds.includes(record.id))

describe('comprehensive article search index', () => {
  it('includes every canonical published article exactly once, with route metadata', () => {
    expect(emptyIndex).toHaveLength(CATALOG_SIZE)
    expect(new Set(ids(emptyIndex)).size).toBe(CATALOG_SIZE)
    expect(emptyIndex.every(record => !record.article.predicted)).toBe(true)
    expect(emptyIndex.some(record => record.id === 'JP-4001')).toBe(false)
    expect(emptyIndex.filter(record => record.id === 'scp-flavor:00539')).toHaveLength(1)
    for (const record of emptyIndex) {
      const canonical = CATALOG_INDEX.get(record.id)
      expect(record.branch).toBe(canonical.branch)
      expect(record.series).toBe(canonical.series)
      expect(record.article.id).toBe(record.id)
      expect(record.article.seriesId).toBe(canonical.seriesId)
    }
  })

  it('searches numeric rows even before titles and metrics arrive', () => {
    const result = queryExploreIndex(emptyIndex, { query: '173', branchCode: 'EN', seriesId: '1' })
    expect(ids(result)).toContain('EN-173')
    expect(result.find(record => record.id === 'EN-173')).toMatchObject({ title: '', charCount: null, rating: null })
    expect(ids(queryExploreIndex(emptyIndex, { query: '4001', branchCode: 'JP' }))).not.toContain('JP-4001')
  })

  it('uses the actual JP URL slug for numeric and custom metrics, preserving zero and negatives', () => {
    const custom = emptyIndex.find(record => record.id === 'scp-666-j')
    const slug = new URL(custom.article.url).pathname.slice(1)
    const index = buildExploreIndex({
      titles: { EN: { 173: 'Test title' } },
      charCounts: { 'scp-173': 0, [slug]: 1234, 'scp-173-jp': 4321 },
      ratings: { 'scp-173': -12, [slug]: 0, 'scp-173-jp': 50 },
    })
    expect(index.find(record => record.id === 'EN-173')).toMatchObject({ title: 'Test title', charCount: 0, rating: -12 })
    expect(index.find(record => record.id === 'JP-173')).toMatchObject({ charCount: 4321, rating: 50 })
    expect(index.find(record => record.id === custom.id)).toMatchObject({ charCount: 1234, rating: 0 })
    expect(index.find(record => record.id === 'EN-174')).toMatchObject({ charCount: null, rating: null })
  })
})

describe('comprehensive article filtering and ordering', () => {
  it('sorts all matching articles before pagination, including records beyond the old 300 cap', () => {
    const count = 650
    const titles = { EN: Object.fromEntries(Array.from({ length: count }, (_, i) => [i + 1, 'Global sorting fixture'])) }
    const ratings = Object.fromEntries(Array.from({ length: count }, (_, i) => [`scp-${String(i + 1).padStart(3, '0')}`, i]))
    const index = buildExploreIndex({ titles, ratings })
    const result = queryExploreIndex(index, { query: 'Global fixture', sortBy: 'rating-desc' })
    expect(result).toHaveLength(count)
    expect(ids(result.slice(0, 3))).toEqual(['EN-650', 'EN-649', 'EN-648'])
    expect(ids(result.slice(300, 303))).toEqual(['EN-350', 'EN-349', 'EN-348'])
    expect(result.at(-1).id).toBe('EN-1')
    expect(queryExploreIndex(index, { query: 'Global fixture', sortBy: 'rating-asc' })[0].id).toBe('EN-1')
  })

  it('normalizes NFKC, case and spaces, with all query terms required', () => {
    const index = buildExploreIndex({ titles: { EN: { 173: 'ＭｉＸｅＤ Office fixture', 174: 'mixed fixture' } } })
    expect(ids(queryExploreIndex(index, { query: '　ＭＩＸＥＤ\t ＯＦＦＩＣＥ　' }))).toEqual(['EN-173'])
    expect(ids(queryExploreIndex(index, { query: 'SCP-173 mixed' }))).toEqual(['EN-173'])
    expect(queryExploreIndex(index, { query: 'office missing' })).toEqual([])
  })

  it('looks up complete designations without leaking their numeric part to other branches', () => {
    expect(ids(queryExploreIndex(emptyIndex, { query: 'ＳＣＰ－１７３' }))).toEqual(['EN-173'])
    expect(ids(queryExploreIndex(emptyIndex, { query: 'scp-173-jp' }))).toEqual(['JP-173'])
    // Distinct saved IDs may share a URL/designation; retain both records.
    expect(ids(queryExploreIndex(emptyIndex, { query: 'scp-cn-173' }))).toEqual(['CN-173', 'scp-cn-173'])
    expect(ids(queryExploreIndex(emptyIndex, { query: 'scp-001' }))).toEqual(['EN-1'])
    expect(ids(queryExploreIndex(emptyIndex, { query: '173' }))).toEqual(expect.arrayContaining(['EN-173', 'JP-173', 'CN-173']))
  })

  it('combines branch, string series, read-state and favorite scopes', () => {
    const checked = new Set(['JP-173', 'JP-1001', 'EN-173'])
    const favorites = new Set(['JP-173', 'JP-174', 'EN-173'])
    const filters = { branchCode: 'jp', seriesId: '1', favoritesOnly: true, isChecked: id => checked.has(id), isFavorite: id => favorites.has(id) }
    expect(ids(queryExploreIndex(emptyIndex, { ...filters, readFilter: 'read' }))).toEqual(['JP-173'])
    expect(ids(queryExploreIndex(emptyIndex, { ...filters, readFilter: 'unread' }))).toEqual(['JP-174'])
    expect(ids(queryExploreIndex(emptyIndex, filters))).toEqual(['JP-173', 'JP-174'])
    const custom = queryExploreIndex(emptyIndex, { branchCode: 'EN', seriesId: 'en-joke' })
    expect(custom.length).toBeGreaterThan(0)
    expect(custom.every(record => record.series.id === 'en-joke' && record.branch.code === 'EN')).toBe(true)
  })

  it('sorts numbers numerically across branches, custom collections last, with deterministic ties', () => {
    const index = subset('EN-2', 'JP-2', 'EN-10', 'JP-10', 'scp-666-j')
    expect(ids(queryExploreIndex(index))).toEqual(['EN-2', 'JP-2', 'EN-10', 'JP-10', 'scp-666-j'])
    expect(ids(queryExploreIndex(index, { sortBy: 'number-desc' }))).toEqual(['EN-10', 'JP-10', 'EN-2', 'JP-2', 'scp-666-j'])
    expect(ids(queryExploreIndex([...index].reverse()))).toEqual(ids(queryExploreIndex(index)))
  })

  it('keeps missing metrics last in both directions and retains zero and negative values', () => {
    const index = buildExploreIndex({
      charCounts: { 'scp-001': 100, 'scp-002': 0, 'scp-003': 250 },
      ratings: { 'scp-001': -10, 'scp-002': 0, 'scp-003': 50 },
    }).filter(record => ['EN-1', 'EN-2', 'EN-3', 'EN-4', 'JP-4'].includes(record.id))
    expect(ids(queryExploreIndex(index, { sortBy: 'rating-asc' }))).toEqual(['EN-1', 'EN-2', 'EN-3', 'EN-4', 'JP-4'])
    expect(ids(queryExploreIndex(index, { sortBy: 'rating-desc' }))).toEqual(['EN-3', 'EN-2', 'EN-1', 'EN-4', 'JP-4'])
    expect(ids(queryExploreIndex(index, { sortBy: 'chars-asc' }))).toEqual(['EN-2', 'EN-1', 'EN-3', 'EN-4', 'JP-4'])
    expect(ids(queryExploreIndex(index, { sortBy: 'chars-desc' }))).toEqual(['EN-3', 'EN-1', 'EN-2', 'EN-4', 'JP-4'])
  })

  it('orders titles and never mutates the shared index or its records', () => {
    const index = buildExploreIndex({ titles: { EN: { 1: 'Zulu', 2: 'Alpha', 3: 'Alpha' } } })
      .filter(record => ['EN-1', 'EN-2', 'EN-3'].includes(record.id))
    const originalIds = ids(index)
    index.forEach(record => Object.freeze(record))
    Object.freeze(index)
    expect(ids(queryExploreIndex(index, { sortBy: 'title-asc' }))).toEqual(['EN-2', 'EN-3', 'EN-1'])
    queryExploreIndex(index, { sortBy: 'number-desc' })
    expect(ids(index)).toEqual(originalIds)
    expect(ids(queryExploreIndex(index, { sortBy: 'unsupported' }))).toEqual(['EN-1', 'EN-2', 'EN-3'])
  })
})
