import { BRANCHES } from '../data/branches.js'

export const DEFAULT_SELECTED = { branchCode: null, view: null, seriesId: null, targetId: null }

export function parseHash(hash) {
  const path = hash.replace(/^#\/?/, '')
  if (!path) return DEFAULT_SELECTED

  const parts = path.split('/')

  if (parts[0] === 'stats')     return { ...DEFAULT_SELECTED, view: 'stats' }
  if (parts[0] === 'search')    return { ...DEFAULT_SELECTED, view: 'search' }
  if (parts[0] === 'favorites') return { ...DEFAULT_SELECTED, view: 'favorites' }
  if (parts[0] === 'queue')     return { ...DEFAULT_SELECTED, view: 'queue' }
  if (parts[0] === 'memos')     return { ...DEFAULT_SELECTED, view: 'memos' }

  // branch-specific: <CODE>/hubs or <CODE>/series/<id>
  const branchCode = parts[0]?.toUpperCase()
  if (!branchCode) return DEFAULT_SELECTED
  const branch = BRANCHES.find(b => b.code === branchCode)
  if (!branch) return DEFAULT_SELECTED

  if (parts[1] === 'hubs') {
    return { branchCode, view: 'hubs', seriesId: null, targetId: null }
  }
  if (parts[1] === 'series') {
    let requestedId = null
    if (parts[2] != null) {
      try {
        requestedId = decodeURIComponent(parts[2])
      } catch {
        requestedId = null
      }
    }
    // Route segments are strings, while regular series IDs are numbers and
    // custom collections use stable string IDs (for example "en-joke").
    // Match by serialized value, then retain the ID's original data type.
    const matchedSeries = requestedId == null
      ? null
      : branch.series.find(s => s.type !== 'separator' && String(s.id) === requestedId)
    const validId = matchedSeries?.id
      ?? (branch.series.find(s => s.type !== 'separator')?.id ?? null)
    return { branchCode, view: 'series', seriesId: validId, targetId: null }
  }

  return DEFAULT_SELECTED
}

export function buildHash(selected) {
  const { branchCode, view, seriesId } = selected
  if (!view && !branchCode) return '#/'
  if (view === 'stats')     return '#/stats'
  if (view === 'search')    return '#/search'
  if (view === 'favorites') return '#/favorites'
  if (view === 'queue')     return '#/queue'
  if (view === 'memos')     return '#/memos'
  if (branchCode && view === 'hubs')   return `#/${branchCode}/hubs`
  if (branchCode && view === 'series') return `#/${branchCode}/series/${seriesId == null ? '' : encodeURIComponent(String(seriesId))}`
  return '#/'
}
