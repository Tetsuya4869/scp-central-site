// Generates urls.json from all branch/series/hub definitions.
// Run: node scripts/generate-urls.mjs

import { BRANCHES } from '../src/data/branches.js'
import { generateArticleUrl, generateJpUrl } from '../src/utils/urlGenerator.js'

const seen = new Set()
const urls = []

function add(url) {
  if (url && !seen.has(url) && url.startsWith('http://scp-jp.wikidot.com/')) {
    seen.add(url)
    urls.push(url)
  }
}

for (const branch of BRANCHES) {
  for (const series of branch.series) {
    if (series.type === 'custom') {
      for (const article of series.articles) {
        add(article.url)
      }
    } else {
      const min = branch.minNumber ? Math.max(series.min, branch.minNumber) : series.min
      for (let n = min; n <= series.max; n++) {
        add(generateJpUrl(branch.code, n))
        add(generateArticleUrl(branch.code, n))
      }
    }
  }

  for (const cat of branch.hubs) {
    for (const item of cat.items) {
      add(item.url)
    }
  }
}

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '..', 'urls.json')

writeFileSync(outPath, JSON.stringify({ urls }, null, 2), 'utf-8')
console.log(`Generated ${urls.length} URLs → urls.json`)
