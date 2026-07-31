import { describe, it, expect } from 'vitest'
import { parseHash, buildHash, DEFAULT_SELECTED } from './routing.js'

describe('parseHash', () => {
  it('空ハッシュは DEFAULT_SELECTED', () => {
    expect(parseHash('')).toEqual(DEFAULT_SELECTED)
    expect(parseHash('#/')).toEqual(DEFAULT_SELECTED)
  })
  it('グローバルビュー', () => {
    expect(parseHash('#/stats').view).toBe('stats')
    expect(parseHash('#/search').view).toBe('search')
    expect(parseHash('#/favorites').view).toBe('favorites')
    expect(parseHash('#/queue').view).toBe('queue')
    expect(parseHash('#/memos').view).toBe('memos')
  })
  it('支部シリーズ', () => {
    expect(parseHash('#/EN/series/1')).toEqual({
      branchCode: 'EN', view: 'series', seriesId: 1, targetId: null,
    })
  })
  it('preserves string IDs for custom series', () => {
    expect(parseHash('#/EN/series/en-joke')).toEqual({
      branchCode: 'EN', view: 'series', seriesId: 'en-joke', targetId: null,
    })
    expect(parseHash('#/JP/series/tales-jp')).toEqual({
      branchCode: 'JP', view: 'series', seriesId: 'tales-jp', targetId: null,
    })
  })
  it('支部コードは大文字に正規化', () => {
    expect(parseHash('#/en/series/1').branchCode).toBe('EN')
  })
  it('支部ハブ', () => {
    expect(parseHash('#/EN/hubs')).toEqual({
      branchCode: 'EN', view: 'hubs', seriesId: null, targetId: null,
    })
  })
  it('未知の支部は DEFAULT_SELECTED', () => {
    expect(parseHash('#/XX')).toEqual(DEFAULT_SELECTED)
  })
  it('不正な seriesId は先頭シリーズにフォールバック', () => {
    const r = parseHash('#/EN/series/9999')
    expect(r.branchCode).toBe('EN')
    expect(r.seriesId).not.toBeNull()
  })
})

describe('buildHash', () => {
  it('各ビュー', () => {
    expect(buildHash({ view: 'stats' })).toBe('#/stats')
    expect(buildHash({ view: 'favorites' })).toBe('#/favorites')
    expect(buildHash({ branchCode: 'EN', view: 'hubs' })).toBe('#/EN/hubs')
    expect(buildHash({ branchCode: 'EN', view: 'series', seriesId: 1 })).toBe('#/EN/series/1')
  })
  it('空は #/', () => {
    expect(buildHash(DEFAULT_SELECTED)).toBe('#/')
  })
})

describe('parseHash / buildHash 往復', () => {
  for (const sel of [
    { branchCode: null, view: 'stats', seriesId: null, targetId: null },
    { branchCode: null, view: 'favorites', seriesId: null, targetId: null },
    { branchCode: 'EN', view: 'hubs', seriesId: null, targetId: null },
    { branchCode: 'EN', view: 'series', seriesId: 1, targetId: null },
    { branchCode: 'EN', view: 'series', seriesId: 'en-joke', targetId: null },
    { branchCode: 'JP', view: 'series', seriesId: 'tales-jp', targetId: null },
  ]) {
    it(`${buildHash(sel)}`, () => {
      expect(parseHash(buildHash(sel))).toEqual(sel)
    })
  }
})
