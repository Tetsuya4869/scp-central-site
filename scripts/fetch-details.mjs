/**
 * fetch-details.mjs
 * タイトルは存在する（＝ページが公開済み）が char_counts.json / ratings.json に
 * データが無い記事について、scp-jp の記事ページから評価・文字数を増分取得する。
 *
 * 実行:
 *   node scripts/fetch-details.mjs [--max N] [--dry-run]
 *     --max N    : 1回の実行で取得する最大ページ数（既定 500 ≈ 17分 @2秒間隔）
 *     --dry-run  : ネットワークに出ず、対象リストとバックログ件数のみ表示
 *
 * 404 だったページは scripts/detail-misses.json に記録し、以後スキップする
 * （存在しないページを毎回再取得してバックログ先頭が詰まるのを防ぐ）。
 */

import { writeFileSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { BRANCHES } from '../src/data/branches.js'
import { generateJpUrl } from '../src/utils/urlGenerator.js'
import { JP_BASE, DELAY_MS, sleep, fetchHtml, extractRating, extractCharCount, sortLexical } from './lib.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const TITLES_PATH = join(__dir, '../src/data/titles.json')
const CHARS_PATH  = join(__dir, '../src/data/char_counts.json')
const RATES_PATH  = join(__dir, '../src/data/ratings.json')
const MISSES_PATH = join(__dir, 'detail-misses.json')

function readJson(path, fallback = {}) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return fallback }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const maxIdx = args.indexOf('--max')
  return {
    max: maxIdx !== -1 ? parseInt(args[maxIdx + 1], 10) || 500 : 500,
    dryRun: args.includes('--dry-run'),
  }
}

async function main() {
  const { max, dryRun } = parseArgs()
  const titles = readJson(TITLES_PATH)
  const chars  = readJson(CHARS_PATH)
  const rates  = readJson(RATES_PATH)
  const misses = readJson(MISSES_PATH)

  // 対象 = タイトル有り かつ (文字数 or 評価 が欠損) かつ misses 未登録
  // BRANCHES 順 → 番号昇順の決定的順序（複数回の実行で先頭から順に消化される）
  const targets = []
  for (const branch of BRANCHES) {
    const map = titles[branch.code]
    if (!map) continue
    const nums = Object.keys(map).map(Number).sort((a, b) => a - b)
    for (const num of nums) {
      const url = generateJpUrl(branch.code, num)
      const slug = url.slice(JP_BASE.length + 1)
      if (slug in misses) continue
      if (slug in chars && slug in rates) continue
      targets.push({ code: branch.code, num, slug, url })
    }
  }

  console.log(`バックログ: ${targets.length} 件（今回の上限: ${max}）`)
  const batch = targets.slice(0, max)

  if (dryRun) {
    console.log('--dry-run: 先頭の対象を表示して終了')
    for (const t of batch.slice(0, 30)) console.log(`  ${t.code}-${t.num}  ${t.slug}`)
    if (batch.length > 30) console.log(`  ... 他 ${batch.length - 30} 件`)
    return
  }

  let okCount = 0, missCount = 0, errCount = 0
  const today = new Date().toISOString().slice(0, 10)

  for (const [i, t] of batch.entries()) {
    try {
      const { status, html } = await fetchHtml(t.url)
      if (status === 404) {
        misses[t.slug] = { date: today, reason: 'not_found' }
        missCount++
        console.log(`  [${i + 1}/${batch.length}] ${t.slug} → 404`)
      } else if (status === 200) {
        const rating = extractRating(html)
        const count  = extractCharCount(html)
        if (count != null)  chars[t.slug] = count
        if (rating != null) rates[t.slug] = rating
        if (rating == null || count == null) {
          // ページはあるが widget/本文が取れない → 毎回再取得しないよう記録
          misses[t.slug] = { date: today, reason: rating == null ? 'no_rating' : 'no_content' }
        }
        okCount++
        console.log(`  [${i + 1}/${batch.length}] ${t.slug} → ${count ?? '-'}字 / 評価${rating ?? '-'}`)
      } else {
        errCount++
        console.error(`  [${i + 1}/${batch.length}] ${t.slug} → HTTP ${status}（次回再試行）`)
      }
    } catch (e) {
      errCount++
      console.error(`  [${i + 1}/${batch.length}] ${t.slug} → ${e.message}（次回再試行）`)
    }
    await sleep(DELAY_MS)
  }

  // house style: データJSONは minified 単一行、misses は可読性優先で整形
  writeFileSync(CHARS_PATH, JSON.stringify(sortLexical(chars)), 'utf8')
  writeFileSync(RATES_PATH, JSON.stringify(sortLexical(rates)), 'utf8')
  writeFileSync(MISSES_PATH, JSON.stringify(sortLexical(misses), null, 2) + '\n', 'utf8')

  console.log(`\n✓ 完了: 取得 ${okCount} / 404 ${missCount} / エラー ${errCount}`)
  console.log(`  残りバックログ: ${targets.length - batch.length} 件`)
}

main().catch(err => {
  console.error('\n✗ エラー:', err)
  process.exit(1)
})
