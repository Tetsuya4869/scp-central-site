import { describe, expect, it } from 'vitest'
import { CATALOG_INDEX, CATALOG_IDS, getCatalogEntry, getCatalogIdsForBranch } from './catalog.js'
import { normalizeReadingPosition, getResumeEntry } from './readingPosition.js'

const idsForSeries = (branchCode, seriesId) => [...CATALOG_INDEX.values()]
  .filter(entry => entry.branchCode === branchCode && entry.seriesId === seriesId)
  .map(entry => entry.id)

describe('published reading position', () => {
  it('keeps only a canonical ID and rejects corrupt, raw-URL and predicted values', () => {
    expect(normalizeReadingPosition({ id: ' JP-173 ', url: 'https://example.com', extra: 'ignored' })).toEqual({ id: 'JP-173' })
    for (const value of [null, undefined, {}, [], 'JP-173', 173, { id: 173 }, { id: '' }, { id: 'JP-4001' }, { id: 'https://example.com/' }]) {
      expect(normalizeReadingPosition(value)).toBeNull()
    }
  })

  it('returns the unread current entry without changing position, flags or canonical metadata', () => {
    const position = { id: 'JP-173' }
    const checked = new Set(['JP-172'])
    expect(getResumeEntry(position, checked)).toBe(getCatalogEntry('JP-173'))
    expect(position).toEqual({ id: 'JP-173' })
    expect(checked).toEqual(new Set(['JP-172']))
  })

  it('advances in natural numeric order and wraps to an earlier unread article in the series', () => {
    expect(getResumeEntry({ id: 'JP-9' }, new Set(['JP-9'])).id).toBe('JP-10')
    const checked = new Set(idsForSeries('JP', 1).filter(id => id !== 'JP-8'))
    expect(getResumeEntry({ id: 'JP-999' }, checked).id).toBe('JP-8')
  })

  it('preserves custom source order rather than sorting the collection by title or numeric text', () => {
    const custom = idsForSeries('EN', 'en-joke')
    expect(custom.length).toBeGreaterThan(2)
    expect(getResumeEntry({ id: custom[0] }, new Set([custom[0]])).id).toBe(custom[1])
    const checked = new Set(custom.filter(id => id !== custom[0]))
    expect(getResumeEntry({ id: custom.at(-1) }, checked).id).toBe(custom[0])
  })

  it('advances to the next series in the same branch before considering other branches', () => {
    const checked = new Set(idsForSeries('JP', 1))
    expect(getResumeEntry({ id: 'JP-999' }, checked).id).toBe('JP-1000')
    expect(getResumeEntry(null, checked, { branchCode: 'JP', seriesId: '1' }).id).toBe('JP-1000')
  })

  it('wraps same-branch series before falling back to another branch', () => {
    const allJP = new Set(getCatalogIdsForBranch('JP'))
    const finalJP = [...CATALOG_INDEX.values()].filter(entry => entry.branchCode === 'JP').at(-1)
    const oneUnreadJP = new Set([...allJP].filter(id => id !== 'JP-2'))
    expect(getResumeEntry({ id: finalJP.id }, oneUnreadJP).id).toBe('JP-2')
    expect(getResumeEntry({ id: finalJP.id }, allJP).branchCode).toBe('EN')
  })

  it('uses fallback selection for missing or corrupt positions, including string custom IDs', () => {
    expect(getResumeEntry({ id: 'unknown' }, [], { branchCode: 'JP', seriesId: '2' }).id).toBe('JP-1000')
    const custom = idsForSeries('JP', 'tales-jp')
    expect(getResumeEntry(null, [], { branchCode: 'jp', seriesId: 'tales-jp' }).id).toBe(custom[0])
    expect(getResumeEntry(null, [], { branchCode: 'JP', seriesId: 'not-a-series' }).id).toBe('JP-1')
    expect(getResumeEntry(null, [], { branchCode: 'unknown' }).id).toBe('EN-1')
  })

  it('does not resume predictions even at the active boundary and returns null when all are read', () => {
    const checked = new Set(idsForSeries('JP', 5))
    const result = getResumeEntry({ id: 'JP-4000' }, checked)
    expect(result.id).not.toBe('JP-4001')
    expect(CATALOG_IDS.has(result.id)).toBe(true)
    expect(getResumeEntry({ id: 'JP-4000' }, CATALOG_IDS)).toBeNull()
    expect(getResumeEntry(null, CATALOG_IDS)).toBeNull()
  })
})
