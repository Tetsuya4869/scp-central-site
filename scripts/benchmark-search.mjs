import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { buildExploreIndex, queryExploreIndex } from '../src/utils/exploreSearch.js'

// Run with: node --expose-gc scripts/benchmark-search.mjs
// Measures the complete result set before SearchPage takes its 100-row page.
const load = name => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'))
const metadata = { titles: load('titles'), charCounts: load('char_counts'), ratings: load('ratings') }

global.gc?.()
const heapBefore = process.memoryUsage().heapUsed
const coldStart = performance.now()
const index = buildExploreIndex(metadata)
console.log(`Index: ${index.length} articles, ${(performance.now() - coldStart).toFixed(2)} ms`)
if (global.gc) {
  global.gc()
  console.log(`Retained index heap: ${((process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024).toFixed(2)} MiB`)
}

for (const options of [
  { query: '', sortBy: 'number-asc' },
  { query: '', sortBy: 'rating-desc' },
  { query: '', sortBy: 'chars-asc' },
  { query: '', sortBy: 'title-asc' },
  { query: '世界', sortBy: 'rating-desc' },
  { query: 'SCP-173', sortBy: 'number-asc' },
]) {
  for (let i = 0; i < 3; i++) queryExploreIndex(index, options)
  const times = []
  let result
  for (let i = 0; i < 20; i++) {
    const start = performance.now()
    result = queryExploreIndex(index, options)
    times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  console.log(JSON.stringify({
    ...options,
    results: result.length,
    medianMs: Number(times[10].toFixed(2)),
    p95Ms: Number(times[19].toFixed(2)),
  }))
}
