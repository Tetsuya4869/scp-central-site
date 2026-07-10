/**
 * fetch-titles.mjs
 * 全支部のシリーズ一覧ハブ（scp-jp.wikidot.com）からタイトルを取得し
 * src/data/titles.json にマージして書き出す。BRANCHES 駆動（支部追加は branches.js のみ）。
 *
 * 実行: npm run fetch-titles
 * 所要時間: 約2分（ハブ約45件 × 2秒間隔）
 */

import { writeFileSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { BRANCHES } from '../src/data/branches.js'
import { JP_BASE, DELAY_MS, sleep, fetchHtml, extractTitles, slugPatternFor, sortNumeric } from './lib.mjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../src/data/titles.json')

async function main() {
  // 既存データを読み込んでマージ（手動追記分・過去取得分を消さない）
  let existing = {}
  try {
    existing = JSON.parse(readFileSync(OUT, 'utf8'))
  } catch {
    console.log('既存データなし、新規作成します。')
  }

  const result = {}
  const report = []

  for (const branch of BRANCHES) {
    const code = branch.code
    result[code] = { ...(existing[code] ?? {}) }
    const before = Object.keys(result[code]).length

    // 数値シリーズの hub を集約（separator/custom は除外）、重複 hub を除去
    const hubs = [...new Set(
      branch.series
        .filter(s => s.type !== 'separator' && s.type !== 'custom' && s.hub)
        .map(s => s.hub)
    )]
    if (hubs.length === 0) continue

    console.log(`\n■ ${code} (${hubs.length} hubs)`)
    const slugPattern = slugPatternFor(branch)
    let fetched = 0

    for (const hub of hubs) {
      try {
        console.log(`  GET ${JP_BASE}${hub}`)
        const { status, html } = await fetchHtml(`${JP_BASE}${hub}`)
        if (status !== 200) {
          console.error(`    ✗ HTTP ${status}`)
        } else {
          const found = extractTitles(html, slugPattern)
          fetched += Object.keys(found).length
          Object.assign(result[code], found) // 非空タイトルのみ来るので既存の実タイトルを空で潰さない
          console.log(`    → ${Object.keys(found).length} 件`)
        }
      } catch (e) {
        console.error(`    ✗ ${e.message}`)
      }
      await sleep(DELAY_MS)
    }

    const after = Object.keys(result[code]).length
    report.push({ code, fetched, added: after - before, total: after })
  }

  // 全支部キーを数値昇順ソートし、house style（minified 単一行）で保存
  const sorted = {}
  for (const code of Object.keys(result)) sorted[code] = sortNumeric(result[code])
  writeFileSync(OUT, JSON.stringify(sorted), 'utf8')

  console.log('\n✓ 完了 — 支部別レポート')
  console.log('支部  取得   新規   合計')
  for (const r of report) {
    console.log(`${r.code.padEnd(4)} ${String(r.fetched).padStart(5)} ${String(r.added).padStart(6)} ${String(r.total).padStart(6)}${r.fetched === 0 ? '  ← 取得0件（hub構造要確認）' : ''}`)
  }
  console.log(`保存先: src/data/titles.json`)
}

main().catch(err => {
  console.error('\n✗ エラー:', err)
  process.exit(1)
})
