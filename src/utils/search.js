import { BRANCHES, BRANCH_MAP } from '../data/branches.js'
import { generateSeriesArticles } from './urlGenerator.js'

export const MAX_SEARCH_RESULTS = 300

// The store replaces its titles object when metadata arrives. Keep both the
// initial custom-only index and the loaded index lazy, without normalizing all
// titles again on every keystroke or branch-filter change.
const indexes = new WeakMap()

function getIndex(titles) {
  const cached = indexes.get(titles)
  if (cached) return cached

  const records = []
  for (const branch of BRANCHES) {
    for (const series of branch.series) {
      if (series.type !== 'custom') continue
      for (const article of series.articles) {
        if (article.predicted) continue
        const title = article.title ?? ''
        records.push({
          branch,
          series,
          sourceArticle: article,
          title,
          designationLower: article.designation.toLowerCase(),
          titleLower: title.toLowerCase(),
        })
      }
    }
  }

  for (const [branchCode, titleMap] of Object.entries(titles)) {
    const branch = BRANCH_MAP[branchCode]
    if (!branch) continue
    for (const [numStr, title] of Object.entries(titleMap)) {
      const number = parseInt(numStr, 10)
      if (Number.isNaN(number) || number > branch.activeMax) continue
      const series = branch.series.find(series => {
        if (series.type === 'custom' || series.type === 'separator') return false
        const min = branch.minNumber ? Math.max(series.min, branch.minNumber) : series.min
        return number >= min && number <= series.max
      })
      if (!series) continue
      records.push({ branch, series, number, title, titleLower: title.toLowerCase() })
    }
  }

  indexes.set(titles, records)
  return records
}

/** Search in custom/title/number order, with branch availability before caps. */
export function searchArticles(query, titles, branchFilter = null, maxResults = MAX_SEARCH_RESULTS) {
  const q = query.trim()
  if (q.length < 2) return { results: [], branches: [] }

  const qLower = q.toLowerCase()
  const results = []
  const seen = new Set()
  const matchingBranches = new Set()

  function needsMatch(branch) {
    return !matchingBranches.has(branch.code)
      || (results.length < maxResults && (!branchFilter || branch.code === branchFilter))
  }

  function add(record) {
    const { branch, series } = record
    matchingBranches.add(branch.code)
    if ((branchFilter && branch.code !== branchFilter) || results.length >= maxResults) return

    // Normalize or generate article objects only for visible matches, then
    // reuse them in later searches against the same metadata snapshot.
    const article = record.article ??= record.sourceArticle
      ? { ...record.sourceArticle, predicted: false }
      : generateSeriesArticles(branch.code, record.number, record.number)[0]
    if (!article || article.predicted || seen.has(article.id)) return
    seen.add(article.id)
    results.push({ article, branch, series, title: record.title ?? titles[branch.code]?.[String(article.number)] ?? '' })
  }

  for (const record of getIndex(titles)) {
    if (!needsMatch(record.branch)) continue
    if (record.designationLower?.includes(qLower) || record.titleLower.includes(qLower)) add(record)
  }

  const numMatch = q.match(/(\d+)/)
  if (numMatch) {
    const number = parseInt(numMatch[1], 10)
    for (const branch of BRANCHES) {
      if (!needsMatch(branch) || number > branch.activeMax) continue
      for (const series of branch.series) {
        if (series.type === 'custom' || series.type === 'separator') continue
        const min = branch.minNumber ? Math.max(series.min, branch.minNumber) : series.min
        if (number >= min && number <= series.max) add({ branch, series, number })
      }
    }
  }

  return { results, branches: BRANCHES.filter(branch => matchingBranches.has(branch.code)) }
}
