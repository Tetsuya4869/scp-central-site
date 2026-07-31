import { describe, expect, it } from 'vitest'
import { loadReadDates, lookupArticle } from './lookupArticle.js'

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries))
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }
}

describe('lookupArticle', () => {
  it('returns null instead of throwing for malformed IDs', () => {
    expect(lookupArticle(null)).toBeNull()
    expect(lookupArticle(undefined)).toBeNull()
    expect(lookupArticle(173)).toBeNull()
    expect(lookupArticle('')).toBeNull()
  })

  it('resolves an indexed custom-series article with its collection metadata', () => {
    const article = lookupArticle('scp-666-j')
    expect(article).toMatchObject({
      id: 'scp-666-j',
      branchCode: 'EN',
      seriesId: 'en-joke',
    })
  })

  it('continues to resolve generated numeric-series articles', () => {
    const article = lookupArticle('EN-173')
    expect(article).toMatchObject({
      id: 'EN-173',
      branchCode: 'EN',
      number: 173,
      seriesId: 1,
    })
  })

  it('requires a canonical numeric ID and a configured regular series', () => {
    for (const id of ['EN-173abc', 'EN-1.5', 'EN--1', 'EN-0173', 'EN-10000', 'JP-5000', 'RU-1']) {
      expect(lookupArticle(id), id).toBeNull()
    }
  })

  it('still resolves configured predicted rows without treating them as catalog entries', () => {
    expect(lookupArticle('JP-4001')).toMatchObject({
      id: 'JP-4001',
      seriesId: 5,
      predicted: true,
    })
  })

  it('loads only Date-safe persisted read timestamps', () => {
    const storage = new MemoryStorage({
      'scp-readdates-v1': JSON.stringify({
        'EN-173': '1722470400000',
        'JP-1': 1e308,
        'CN-1': 0,
      }),
    })

    expect(loadReadDates(storage)).toEqual(new Map([['EN-173', 1722470400000]]))
  })

  it('returns an empty history when storage is unavailable', () => {
    expect(loadReadDates(null)).toEqual(new Map())
  })
})
