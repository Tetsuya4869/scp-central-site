/**
 * fetch-titles.mjs
 * scp-jp.wikidot.com のシリーズ一覧ページからタイトルを取得し
 * src/data/titles.json に書き出す。
 *
 * 実行: npm run fetch-titles
 * 所要時間: 約2〜3分（サーバー負荷軽減のため各リクエスト間に2秒の待機あり）
 */

import { writeFileSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../src/data/titles.json')
const BASE = 'http://scp-jp.wikidot.com'
const DELAY_MS = 2000

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchHtml(path) {
  console.log(`  GET ${BASE}${path}`)
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'User-Agent': 'SCP-Checklist-TitleFetcher/1.0 (personal reading tracker)' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`)
  return res.text()
}

/**
 * Wikidot のシリーズ一覧ページのHTMLから { "番号": "タイトル" } を抽出する。
 *
 * シリーズページの行は概ね以下のいずれかの形:
 *   <a href="/scp-173-jp">SCP-173-JP</a></td><td ...>タイトル</td>
 *   <a href="/scp-173-jp">SCP-173-JP</a> - タイトル
 */
function extractTitles(html, slugPattern) {
  const titles = {}

  // ── パターン1: <td>...</td> 隣接セル形式 ──────────────────────────
  // href="/scp-NNN{suffix}">SCP-NNN...</a></td><td...>TITLE
  const re1 = new RegExp(
    `href="\\/${slugPattern}"[^>]*>[^<]*<\\/a><\\/td>\\s*<td[^>]*>(?:<[^>]+>)?([^<]+)`,
    'gi'
  )
  let m
  while ((m = re1.exec(html)) !== null) {
    const num = extractNumber(m[0], slugPattern)
    const title = cleanTitle(m[1])
    if (num && title) titles[num] = title
  }

  // ── パターン2: ハイフン区切りのリスト形式 ──────────────────────────
  // href="/scp-NNN{suffix}">SCP-NNN...</a> - タイトル
  const re2 = new RegExp(
    `href="\\/${slugPattern}"[^>]*>[^<]*<\\/a>\\s*[-–]\\s*([^<\\n]{2,60})`,
    'gi'
  )
  while ((m = re2.exec(html)) !== null) {
    const num = extractNumber(m[0], slugPattern)
    const title = cleanTitle(m[1])
    if (num && title) titles[num] = title
  }

  return titles
}

function extractNumber(str, slugPattern) {
  // slugPattern 例: "scp-(\\d+)-jp" → 最初の数値グループを取り出す
  const m = str.match(/href="\/scp-(\d+)(?:-jp)?(?:-en)?(?:-\w+)?"/i)
  if (!m) return null
  return String(parseInt(m[1], 10)) // "0173" → "173"
}

function cleanTitle(raw) {
  if (!raw) return ''
  const t = raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .trim()
  // SCPナンバー形式・記号のみ・空白は除外
  if (!t || t === '-' || t === '—' || /^SCP-/i.test(t)) return ''
  return t
}

// ─────────────────────────────────────────────────────────────────────
//  JP原作シリーズ一覧 (/scp-series-jp 〜 /scp-series-jp-5)
// ─────────────────────────────────────────────────────────────────────
const JP_HUBS = [
  '/scp-series-jp',
  '/scp-series-jp-2',
  '/scp-series-jp-3',
  '/scp-series-jp-4',
  '/scp-series-jp-5',
]

// ─────────────────────────────────────────────────────────────────────
//  EN翻訳シリーズ一覧 (/scp-series 〜 /scp-series-10)
//  JP wiki上ではEN記事も日本語タイトルで一覧されている
// ─────────────────────────────────────────────────────────────────────
const EN_HUBS = [
  '/scp-series',
  '/scp-series-2',
  '/scp-series-3',
  '/scp-series-4',
  '/scp-series-5',
  '/scp-series-6',
  '/scp-series-7',
  '/scp-series-8',
  '/scp-series-9',
  '/scp-series-10',
]

async function main() {
  // 既存データを読み込んでマージ（手動追記分を消さない）
  let existing = { EN: {}, JP: {} }
  try {
    existing = JSON.parse(readFileSync(OUT, 'utf8'))
  } catch {
    console.log('既存データなし、新規作成します。')
  }

  const result = {
    EN: { ...existing.EN },
    JP: { ...existing.JP },
  }

  // ── JP原作 ────────────────────────────────────────────────────────
  console.log('\n■ JP原作シリーズを取得中...')
  for (const hub of JP_HUBS) {
    try {
      const html = await fetchHtml(hub)
      const found = extractTitles(html, 'scp-(\\d+)-jp')
      const count = Object.keys(found).length
      Object.assign(result.JP, found)
      console.log(`    → ${count} 件取得`)
    } catch (e) {
      console.error(`    ✗ ${e.message}`)
    }
    await sleep(DELAY_MS)
  }

  // ── EN翻訳 ────────────────────────────────────────────────────────
  console.log('\n■ EN翻訳シリーズを取得中...')
  for (const hub of EN_HUBS) {
    try {
      const html = await fetchHtml(hub)
      const found = extractTitles(html, 'scp-(\\d+)')
      // JP記事のスラッグ（scp-NNN-jp）にもヒットしないよう番号1000未満/1000以上で分割
      const count = Object.keys(found).length
      Object.assign(result.EN, found)
      console.log(`    → ${count} 件取得`)
    } catch (e) {
      console.error(`    ✗ ${e.message}`)
    }
    await sleep(DELAY_MS)
  }

  // ── 保存 ──────────────────────────────────────────────────────────
  const sorted = {
    EN: Object.fromEntries(
      Object.entries(result.EN).sort((a, b) => Number(a[0]) - Number(b[0]))
    ),
    JP: Object.fromEntries(
      Object.entries(result.JP).sort((a, b) => Number(a[0]) - Number(b[0]))
    ),
  }

  writeFileSync(OUT, JSON.stringify(sorted, null, 2), 'utf8')

  console.log(`\n✓ 完了`)
  console.log(`  EN: ${Object.keys(sorted.EN).length} 件`)
  console.log(`  JP: ${Object.keys(sorted.JP).length} 件`)
  console.log(`  保存先: src/data/titles.json`)
}

main().catch(err => {
  console.error('\n✗ エラー:', err)
  process.exit(1)
})
