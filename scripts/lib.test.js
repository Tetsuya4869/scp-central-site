import { describe, it, expect } from 'vitest'
import {
  cleanTitle,
  slugPatternFor,
  extractTitles,
  extractRating,
  extractCharCount,
} from './lib.mjs'

// ── wikidot の代表的なHTML断片フィクスチャ ──────────────────────────────

const TD_FORM_JP = `
<tr><td><a href="/scp-173-jp">SCP-173-JP</a></td><td style="text-align: left;">高天原</td></tr>
<tr><td><a href="/scp-002-jp">SCP-002-JP</a></td><td><span>渋谷区狂気マンション</span></td></tr>
`

const HYPHEN_FORM_EN = `
<ul>
<li><a href="/scp-173">SCP-173</a> - 彫刻 - オリジナル</li>
<li><a href="/scp-096">SCP-096</a> – シャイガイ</li>
<li><a href="/scp-999">SCP-999</a> - くすぐりオバケ</li>
</ul>
`

// EN パターンが suffix/prefix スラッグに誤ヒットしないことを確認する混在断片
const MIXED = `
<li><a href="/scp-173">SCP-173</a> - 彫刻</li>
<li><a href="/scp-173-jp">SCP-173-JP</a> - 高天原</li>
<li><a href="/scp-cn-173">SCP-CN-173</a> - 應急食品</li>
`

const RATING_WIDGET = `
<div class="page-rate-widget-box">
<span class="rate-points">評価:&nbsp;<span class="number prw54353">+391</span></span>
<span class="rateup btn btn-default"><a title="up">+</a></span>
</div>
`

const ARTICLE_PAGE = `
<html><body>
<div id="main-content">
<div id="page-title">SCP-XXX-JP</div>
<div id="page-content">
<div class="page-rate-widget-box"><span class="rate-points">評価:&nbsp;<span class="number">+42</span></span></div>
<p><strong>アイテム番号:</strong> SCP-XXX-JP</p>
<p>オブジェクトクラスはSafeです。</p>
<style>.x{color:red}</style>
</div>
<div class="page-tags"><span>tags here should not be counted あいうえお</span></div>
</div>
</body></html>
`

// ── tests ───────────────────────────────────────────────────────────────

describe('cleanTitle', () => {
  it('通常タイトルはそのまま', () => {
    expect(cleanTitle('彫刻 - オリジナル')).toBe('彫刻 - オリジナル')
  })
  it('HTML実体参照を復元', () => {
    expect(cleanTitle('A &amp; B&nbsp;&quot;C&quot;')).toBe('A & B "C"')
  })
  it('プレースホルダは空を返す（N/A regression 対策）', () => {
    expect(cleanTitle('N/A')).toBe('')
    expect(cleanTitle('-')).toBe('')
    expect(cleanTitle('—')).toBe('')
    expect(cleanTitle('SCP-1730')).toBe('')
    expect(cleanTitle('  ')).toBe('')
  })
})

describe('slugPatternFor', () => {
  const b = (code, urlPattern) => ({ code, urlPattern })
  it('urlPattern 別に専用パターンを返す', () => {
    expect(slugPatternFor(b('EN', 'en'))).toBe('scp-(\\d+)')
    expect(slugPatternFor(b('JP', 'suffix'))).toBe('scp-(\\d+)-jp')
    expect(slugPatternFor(b('CN', 'prefix-cn'))).toBe('scp-cn-(\\d+)')
    expect(slugPatternFor(b('PL', 'prefix-pl'))).toBe('scp-pl-(\\d+)')
    expect(slugPatternFor(b('ZH', 'prefix-zh'))).toBe('scp-zh-(\\d+)')
  })
})

describe('extractTitles', () => {
  it('tdセル形式（JP suffix）', () => {
    const t = extractTitles(TD_FORM_JP, 'scp-(\\d+)-jp')
    expect(t['173']).toBe('高天原')
    expect(t['2']).toBe('渋谷区狂気マンション') // ゼロ埋め番号は "2" に正規化
  })
  it('ハイフン区切り形式（EN）', () => {
    const t = extractTitles(HYPHEN_FORM_EN, 'scp-(\\d+)')
    expect(t['173']).toBe('彫刻 - オリジナル')
    expect(t['96']).toBe('シャイガイ') // – (en dash) 区切りにも対応
    expect(t['999']).toBe('くすぐりオバケ')
  })
  it('ENパターンは suffix/prefix スラッグに誤ヒットしない', () => {
    const t = extractTitles(MIXED, 'scp-(\\d+)')
    expect(t).toEqual({ '173': '彫刻' })
  })
  it('prefixパターンは EN スラッグに誤ヒットしない', () => {
    const t = extractTitles(MIXED, 'scp-cn-(\\d+)')
    expect(t).toEqual({ '173': '應急食品' })
  })
})

describe('extractRating', () => {
  it('rating widget から数値を抽出', () => {
    expect(extractRating(RATING_WIDGET)).toBe(391)
  })
  it('負の評価', () => {
    expect(extractRating('<span class="number prw1">-5</span>')).toBe(-5)
  })
  it('widget が無ければ null', () => {
    expect(extractRating('<div>no rating here</div>')).toBeNull()
  })
})

describe('extractCharCount', () => {
  it('page-content の本文文字数（タグ・widget・style・空白を除去）', () => {
    const n = extractCharCount(ARTICLE_PAGE)
    // "アイテム番号:SCP-XXX-JP" (17) + "オブジェクトクラスはSafeです。" (17) = 34
    expect(n).toBe(34)
  })
  it('page-tags 以降（タグ欄）は数えない', () => {
    const n = extractCharCount(ARTICLE_PAGE)
    expect(n).toBeLessThan(40) // タグ欄まで数えると大きく超える
  })
  it('page-content が無ければ null', () => {
    expect(extractCharCount('<html><body>404</body></html>')).toBeNull()
  })
})
