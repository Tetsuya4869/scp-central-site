import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { searchArticles } from '../src/utils/search.js'

// Run with: node --expose-gc scripts/benchmark-search.mjs
// Measures the query and matching branch chips together, as rendered by SearchPage.
const titles = JSON.parse(readFileSync(new URL('../src/data/titles.json', import.meta.url), 'utf8'))
const queries = ['zzzzzz', 'SCP', '173', '世界', '幻想']

global.gc?.()
const heapBefore = process.memoryUsage().heapUsed
const coldStart = performance.now()
searchArticles(queries[0], titles)
console.log(`First search including index creation: ${(performance.now() - coldStart).toFixed(2)} ms`)
if (global.gc) {
  global.gc()
  console.log(`Retained search index heap: ${((process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024).toFixed(2)} MiB`)
}

for (const query of queries) {
  for (let i = 0; i < 15; i++) searchArticles(query, titles)
  const times = []
  let result
  for (let i = 0; i < 100; i++) {
    const start = performance.now()
    result = searchArticles(query, titles)
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  console.log(JSON.stringify({
    query,
    results: result.results.length,
    branches: result.branches.length,
    medianMs: Number(times[50].toFixed(2)),
    p95Ms: Number(times[95].toFixed(2)),
  }))
}
