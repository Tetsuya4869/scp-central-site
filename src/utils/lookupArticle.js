import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from './urlGenerator.js'
import TITLES from '../data/titles.json'

export function lookupArticle(id) {
  for (const branch of BRANCHES) {
    for (const series of branch.series) {
      if (series.type === 'custom') {
        const a = series.articles.find(a => a.id === id)
        if (a) return { ...a, branchCode: branch.code, branch }
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
          const title = TITLES[branch.code]?.[String(number)] ?? ''
          return { ...article, branch, title }
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
