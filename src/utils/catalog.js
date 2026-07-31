import { BRANCHES } from '../data/branches.js'

const index = new Map()
const ids = new Set()
const mutableIdsByBranch = new Map(BRANCHES.map(branch => [branch.code, []]))
const EMPTY_IDS = Object.freeze([])

function addEntry(entry) {
  if (!entry.id || index.has(entry.id)) return
  const frozenEntry = Object.freeze(entry)
  index.set(entry.id, frozenEntry)
  ids.add(entry.id)
  mutableIdsByBranch.get(entry.branchCode)?.push(entry.id)
}

for (const branch of BRANCHES) {
  for (const series of branch.series) {
    if (series.type === 'separator') continue

    if (series.type === 'custom') {
      for (const article of series.articles ?? []) {
        if (!article || typeof article.id !== 'string' || !article.id || article.predicted) continue
        addEntry({
          id: article.id,
          branchCode: branch.code,
          branch,
          seriesId: series.id,
          series,
          number: article.number ?? null,
          article,
        })
      }
      continue
    }

    const min = branch.minNumber ? Math.max(series.min, branch.minNumber) : series.min
    const max = Math.min(series.max, branch.activeMax)
    for (let number = min; number <= max; number++) {
      addEntry({
        id: `${branch.code}-${number}`,
        branchCode: branch.code,
        branch,
        seriesId: series.id,
        series,
        number,
        article: null,
      })
    }
  }
}

/** Read-only by convention: canonical, published article metadata by ID. */
export const CATALOG_INDEX = index

/** Read-only by convention: canonical IDs, globally de-duplicated. */
export const CATALOG_IDS = ids

/** Branch code -> frozen canonical ID array, with predicted entries removed. */
export const CATALOG_IDS_BY_BRANCH = new Map(
  [...mutableIdsByBranch].map(([branchCode, branchIds]) => [branchCode, Object.freeze(branchIds)]),
)

export const CATALOG_SIZE = CATALOG_IDS.size

export function isCatalogArticle(id) {
  return typeof id === 'string' && CATALOG_IDS.has(id)
}

export function getCatalogEntry(id) {
  return typeof id === 'string' ? (CATALOG_INDEX.get(id) ?? null) : null
}

export function getCatalogIdsForBranch(branchCode) {
  return CATALOG_IDS_BY_BRANCH.get(branchCode) ?? EMPTY_IDS
}
