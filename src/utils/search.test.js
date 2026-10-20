import { describe, expect, it } from 'vitest'
import { MAX_SEARCH_RESULTS, searchArticles } from './search.js'

const EMPTY_TITLES = {}
const ids = result => result.results.map(({ article }) => article.id)

describe('article search', () => {
  it('ignores short queries and normalizes whitespace and case', () => {
    const titles = { EN: { 173: 'MiXeD CaSe fixture' } }

    expect(searchArticles(' a ', titles)).toEqual({ results: [], branches: [] })
    expect(ids(searchArticles('  mixed CASE  ', titles))).toEqual(['EN-173'])
  })

  it('keeps custom matches before title matches before numeric matches', () => {
    const titles = { EN: { 173: '173 fixture' }, JP: { 1: '173 fixture' } }
    const resultIds = ids(searchArticles('173', titles))

    expect(resultIds.indexOf('scp-173-j')).toBeLessThan(resultIds.indexOf('EN-173'))
    expect(resultIds.indexOf('EN-173')).toBeLessThan(resultIds.indexOf('JP-1'))
    expect(resultIds.indexOf('JP-1')).toBeLessThan(resultIds.indexOf('JP-173'))
    expect(resultIds.filter(id => id === 'EN-173')).toHaveLength(1)
  })

  it('deduplicates repeated custom article IDs', () => {
    const result = searchArticles('00539', EMPTY_TITLES)

    expect(ids(result).filter(id => id === 'scp-flavor:00539')).toHaveLength(1)
    expect(result.results.find(({ article }) => article.id === 'scp-flavor:00539').series.id).toBe('scp-flavor')
  })

  it('excludes predicted and out-of-range rows from title and numeric matches', () => {
    const titles = {
      JP: { 4000: 'boundary fixture', 4001: 'boundary fixture' },
      RU: { 999: 'boundary fixture', 1000: 'boundary fixture' },
    }

    expect(ids(searchArticles('boundary fixture', titles))).toEqual(['JP-4000', 'RU-1000'])
    expect(ids(searchArticles('4001', titles))).not.toContain('JP-4001')
    expect(ids(searchArticles('999', titles))).not.toContain('RU-999')
    expect(searchArticles('4001', titles).results.every(({ article }) => !article.predicted)).toBe(true)
  })

  it('retains branch availability and scoped results beyond the global cap', () => {
    const titles = {
      EN: Object.fromEntries(Array.from({ length: MAX_SEARCH_RESULTS + 20 }, (_, i) => [i + 1, 'cap fixture'])),
      CS: { 1: 'cap fixture' },
    }
    const global = searchArticles('cap fixture', titles)
    const scoped = searchArticles('cap fixture', titles, 'CS')

    expect(global.results).toHaveLength(MAX_SEARCH_RESULTS)
    expect(global.results.every(({ branch }) => branch.code === 'EN')).toBe(true)
    expect(global.branches.map(branch => branch.code)).toEqual(['EN', 'CS'])
    expect(ids(scoped)).toEqual(['CS-1'])
    expect(scoped.branches).toEqual(global.branches)
    expect(searchArticles('cap fixture', titles, 'EN').results).toHaveLength(MAX_SEARCH_RESULTS)
  })

  it('refreshes search records when the loaded titles snapshot replaces the empty snapshot', () => {
    const initialTitles = {}
    const loadedTitles = { EN: { 173: 'metadata arrival fixture' } }

    expect(ids(searchArticles('metadata arrival fixture', initialTitles))).toEqual([])
    expect(ids(searchArticles('metadata arrival fixture', loadedTitles))).toEqual(['EN-173'])
    expect(ids(searchArticles('metadata arrival fixture', initialTitles))).toEqual([])
  })
})
