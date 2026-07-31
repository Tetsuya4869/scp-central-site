import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from './urlGenerator.js'
import { getTitles } from '../data/dataStore.js'

export function lookupArticle(id) {
  for (const branch of BRANCHES) {
    for (const series of branch.series) {
      if (series.type === 'custom') {
        const a = series.articles.find(a => a.id === id)
        if (a) return { ...a, branchCode: branch.code, branch, seriesId: series.id }
      }
    }
  }
  for (const branch of BRANCHES) {
    const prefix = branch.code + '-'
    if (id.startsWith(prefix)) {
      const number = parseInt(id.slice(prefix.length), 10)
      if (!isNaN(number)) {
        const [article] = generateSeriesArticles(branch.code, number, number)
        if (article) {
          const title = getTitles()[branch.code]?.[String(number)] ?? ''
          const series = branch.series.find(s => {
            if (s.type === 'custom' || s.type === 'separator') return false
            const min = branch.minNumber ? Math.max(s.min, branch.minNumber) : s.min
            return number >= min && number <= s.max
          })
          return { ...article, branch, title, seriesId: series?.id ?? null }
        }
      }
    }
  }
  return null
}

export function loadReadDates() {
  try {
    const raw = localStorage.getItem('scp-readdates-v1')
    if (!raw) return new Map()
    return new Map(Object.entries(JSON.parse(raw)).map(([k, v]) => [k, Number(v)]))
  } catch {
    return new Map()
  }
}
