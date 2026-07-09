/**
 * lib.mjs — fetch-titles / fetch-details 共有の取得・抽出ロジック。
 * 抽出関数は vitest（scripts/lib.test.js）から直接テストできるよう export する。
 */

export const JP_BASE = 'http://scp-jp.wikidot.com'
export const DELAY_MS = 2000
export const USER_AGENT = 'SCP-Checklist-TitleFetcher/2.0 (personal reading tracker)'

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

export async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  return { status: res.status, html: res.ok ? await res.text() : '' }
}

export function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
}

export function cleanTitle(raw) {
  if (!raw) return ''
  const t = decodeEntities(raw).trim()
  // SCPナンバー形式・記号のみ・空白・プレースホルダは除外
  // （N/A は実タイトルを上書きする regression を起こした実績があるため明示除外）
  if (!t || t === '-' || t === '—' || t === 'N/A' || /^SCP-/i.test(t)) return ''
  return t
}

/**
 * 支部の urlPattern に応じたスラッグ用 regex ソースを返す。
 * 唯一のキャプチャグループ = 記事番号。
 * prefix 系を専用パターンで抽出しないと EN の scp-(\d+) と衝突する。
 */
export function slugPatternFor(branch) {
  const lc = branch.code.toLowerCase()
  switch (branch.urlPattern) {
    case 'en':        return 'scp-(\\d+)'
    case 'prefix-cn': return 'scp-cn-(\\d+)'
    case 'prefix-pl': return 'scp-pl-(\\d+)'
    case 'prefix-zh': return 'scp-zh-(\\d+)'
    case 'suffix':
    default:          return `scp-(\\d+)-${lc}`
  }
}

/**
 * シリーズ一覧ページのHTMLから { "番号": "タイトル" } を抽出する。
 * 行の形式は2種:
 *   <a href="/scp-173-jp">SCP-173-JP</a></td><td ...>タイトル</td>
 *   <a href="/scp-173-jp">SCP-173-JP</a> - タイトル
 * slugPattern の直後に `"` を要求するため、EN の scp-(\d+) が
 * scp-173-jp 等の suffix/prefix スラッグへ誤ヒットすることはない。
 */
export function extractTitles(html, slugPattern) {
  const titles = {}

  // パターン1: <td> 隣接セル形式
  const re1 = new RegExp(
    `href="\\/${slugPattern}"[^>]*>[^<]*<\\/a><\\/td>\\s*<td[^>]*>(?:<[^>]+>)?([^<]+)`,
    'gi'
  )
  let m
  while ((m = re1.exec(html)) !== null) {
    const num = String(parseInt(m[1], 10))
    const title = cleanTitle(m[2])
    if (num !== 'NaN' && title) titles[num] = title
  }

  // パターン2: ハイフン区切りリスト形式
  const re2 = new RegExp(
    `href="\\/${slugPattern}"[^>]*>[^<]*<\\/a>\\s*[-–]\\s*([^<\\n]{2,60})`,
    'gi'
  )
  while ((m = re2.exec(html)) !== null) {
    const num = String(parseInt(m[1], 10))
    const title = cleanTitle(m[2])
    if (num !== 'NaN' && !(num in titles) && title) titles[num] = title
  }

  return titles
}

/**
 * 記事ページのHTMLから rating を抽出する。
 * rating widget: <span class="rate-points">評価: <span class="number prw...">+391</span>
 * 見つからなければ null。
 */
export function extractRating(html) {
  const m = html.match(/class="number[^"]*"[^>]*>\s*([+-]?\d+)/)
  return m ? parseInt(m[1], 10) : null
}

/**
 * 記事ページのHTMLから本文文字数を抽出する。
 * #page-content から page-tags / page-info までを本文とみなし、
 * script/style・rating widget を除去 → タグ除去 → 実体参照復元 → 空白除去して数える。
 * 見つからなければ null。
 */
export function extractCharCount(html) {
  const start = html.indexOf('id="page-content"')
  if (start === -1) return null
  // 開始タグの断片（id="page-content">）を本文に含めない
  const tagEnd = html.indexOf('>', start)
  if (tagEnd === -1) return null
  let body = html.slice(tagEnd + 1)
  // 本文の終端マーカー（存在する最初のもの）まで
  for (const marker of ['<div class="page-tags"', '<div id="page-info', '<div id="footer']) {
    const end = body.indexOf(marker)
    if (end !== -1) { body = body.slice(0, end); break }
  }
  const text = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<div class="page-rate-widget-box"[\s\S]*?<\/div>/gi, '')
    .replace(/<[^>]+>/g, '')
  const count = decodeEntities(text).replace(/\s+/g, '').length
  return count > 0 ? count : null
}

/** 数値キーを昇順に並べ替えたオブジェクトを返す */
export function sortNumeric(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => Number(a[0]) - Number(b[0]))
  )
}

/** 文字列キーを辞書順に並べ替えたオブジェクトを返す */
export function sortLexical(obj) {
  return Object.fromEntries(
    Object.entries(obj).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  )
}
