import { describe, it, expect } from 'vitest'
import {
  generateArticleUrl,
  generateJpUrl,
  formatDesignation,
  isPredicted,
  generateSeriesArticles,
} from './urlGenerator.js'

describe('generateJpUrl (slug rules per urlPattern)', () => {
  it('en pattern → scp-{n} (3桁ゼロ埋め)', () => {
    expect(generateJpUrl('EN', 173)).toBe('http://scp-jp.wikidot.com/scp-173')
    expect(generateJpUrl('EN', 7)).toBe('http://scp-jp.wikidot.com/scp-007')
  })
  it('suffix pattern → scp-{n}-{code}', () => {
    expect(generateJpUrl('JP', 173)).toBe('http://scp-jp.wikidot.com/scp-173-jp')
    expect(generateJpUrl('KO', 1)).toBe('http://scp-jp.wikidot.com/scp-001-ko')
  })
  it('prefix-cn / prefix-pl / prefix-zh', () => {
    expect(generateJpUrl('CN', 173)).toBe('http://scp-jp.wikidot.com/scp-cn-173')
    expect(generateJpUrl('PL', 7)).toBe('http://scp-jp.wikidot.com/scp-pl-007')
    expect(generateJpUrl('ZH', 5)).toBe('http://scp-jp.wikidot.com/scp-zh-005')
  })
})

describe('generateArticleUrl (original wiki domain)', () => {
  it('EN は本家ドメイン', () => {
    expect(generateArticleUrl('EN', 173)).toBe('http://scp-wiki.wikidot.com/scp-173')
  })
  it('未知の支部は null', () => {
    expect(generateArticleUrl('XX', 1)).toBeNull()
  })
})

describe('formatDesignation', () => {
  it('支部ごとの表記', () => {
    expect(formatDesignation('EN', 173)).toBe('SCP-173')
    expect(formatDesignation('JP', 1)).toBe('SCP-001-JP')
    expect(formatDesignation('CN', 173)).toBe('SCP-CN-173')
    expect(formatDesignation('PL', 7)).toBe('SCP-PL-007')
    expect(formatDesignation('ZH', 5)).toBe('SCP-ZH-005')
    expect(formatDesignation('KO', 1)).toBe('SCP-001-KO')
  })
})

describe('isPredicted', () => {
  it('activeMax 以下は false、超過は true', () => {
    expect(isPredicted('EN', 9999)).toBe(false)
    expect(isPredicted('EN', 10000)).toBe(true)
  })
  it('未知の支部は true', () => {
    expect(isPredicted('XX', 1)).toBe(true)
  })
})

describe('generateSeriesArticles', () => {
  it('範囲どおりの件数とidを生成', () => {
    const list = generateSeriesArticles('EN', 1, 10)
    expect(list).toHaveLength(10)
    expect(list[0].id).toBe('EN-1')
    expect(list[9].id).toBe('EN-10')
  })
  it('minNumber を持つ支部(RU)は下限が繰り上がる', () => {
    const list = generateSeriesArticles('RU', 998, 1002)
    expect(list).toHaveLength(3)        // 1000, 1001, 1002
    expect(list[0].id).toBe('RU-1000')
  })
})
