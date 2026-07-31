import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from './urlGenerator.js'
import { getTitles } from '../data/dataStore.js'
import { normalizeTimestampRecord } from './timestamps.js'

let customArticleIndex = null

function getCustomArticleIndex() {
  if (customArticleIndex) return customArticleIndex
  const index = new Map()
  for (const branch of BRANCHES) {
    for (const series of branch.series) {
      if (series.type !== 'custom' || !Array.isArray(series.articles)) continue
      for (const article of series.articles) {
        if (!article || typeof article.id !== 'string' || index.has(article.id)) continue
        // Keep the first match to preserve the previous nested-loop behavior
        // where duplicate catalog IDs resolved to their earliest occurrence.
        index.set(article.id, { article, branch, seriesId: series.id })
      }
    }
  }
  customArticleIndex = index
  return index
}

export function lookupArticle(id) {
  if (typeof id !== 'string' || !id) return null

  const customMatch = getCustomArticleIndex().get(id)
  if (customMatch) {
    const { article, branch, seriesId } = customMatch
    return { ...article, branchCode: branch.code, branch, seriesId }
  }

  for (const branch of BRANCHES) {
    const prefix = branch.code + '-'
    if (!id.startsWith(prefix)) continue

    const numericPart = id.slice(prefix.length)
    if (!/^[1-9]\d*$/.test(numericPart)) return null

    const number = Number(numericPart)
    if (!Number.isSafeInteger(number)) return null

    const series = branch.series.find(s => {
      if (s.type === 'custom' || s.type === 'separator') return false
      const min = branch.minNumber ? Math.max(s.min, branch.minNumber) : s.min
      return number >= min && number <= s.max
    })
    if (!series) return null

    const [article] = generateSeriesArticles(branch.code, number, number)
    if (!article || article.id !== id) return null

    const title = getTitles()[branch.code]?.[String(number)] ?? ''
    return { ...article, branch, title, seriesId: series.id }
  }
  return null
}

export function loadReadDates(
  storage = typeof localStorage === 'undefined' ? null : localStorage,
) {
  try {
    const raw = storage?.getItem('scp-readdates-v1')
    if (!raw) return new Map()
    return normalizeTimestampRecord(JSON.parse(raw))
  } catch {
    return new Map()
  }
}
