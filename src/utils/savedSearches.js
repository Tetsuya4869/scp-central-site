import { BRANCHES } from '../data/branches.js'

export const SAVED_SEARCH_STORAGE_KEY = 'scp-saved-searches-v1'
export const MAX_SAVED_SEARCHES = 5
export const SEARCH_SORT_KEYS = Object.freeze([
  'number-asc', 'number-desc', 'title-asc', 'rating-desc', 'rating-asc', 'chars-asc', 'chars-desc',
])
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Keep only search conditions. Flags, article records and pagination never enter a preset. */
export function normalizeSearchFilters(value) {
  const source = isRecord(value) ? value : {}
  const code = typeof source.branchCode === 'string' ? source.branchCode.trim().toUpperCase() : ''
  const branch = BRANCHES.find(item => item.code === code)
  const requestedSeries = ['string', 'number'].includes(typeof source.seriesId) ? String(source.seriesId) : ''
  const series = branch?.series.find(item => item.type !== 'separator' && String(item.id) === requestedSeries)
  return {
    query: typeof source.query === 'string' ? source.query : '',
    branchCode: branch?.code ?? '',
    seriesId: series ? String(series.id) : '',
    readFilter: ['all', 'read', 'unread'].includes(source.readFilter) ? source.readFilter : 'all',
    favoritesOnly: source.favoritesOnly === true,
    sortBy: SEARCH_SORT_KEYS.includes(source.sortBy) ? source.sortBy : 'number-asc',
  }
}

/** Stable IDs and order allow backup imports to merge conditions predictably. */
export function normalizeSavedSearches(value, { truncate = true } = {}) {
  if (!Array.isArray(value)) return []
  const result = []
  const seen = new Set()
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || !isRecord(item.filters)) continue
    const id = item.id.trim()
    const name = item.name.trim().slice(0, 60)
    if (!id || id.length > 200 || !name || seen.has(id)) continue
    seen.add(id)
    result.push({ id, name, filters: normalizeSearchFilters(item.filters) })
    if (truncate && result.length === MAX_SAVED_SEARCHES) break
  }
  return result
}

export class SavedSearchValidationError extends Error {}

export function addSavedSearch(value, { id, name, filters }) {
  const current = normalizeSavedSearches(value)
  if (current.length >= MAX_SAVED_SEARCHES) throw new SavedSearchValidationError('検索条件は5件まで保存できます。不要な条件を削除してから保存してください。')
  const [entry] = normalizeSavedSearches([{ id, name, filters }])
  if (!entry) throw new SavedSearchValidationError('保存する名前と検索条件を確認してください。')
  if (current.some(item => item.name === entry.name)) throw new SavedSearchValidationError('同じ名前の検索条件があります。別の名前で保存してください。')
  if (current.some(item => item.id === entry.id)) throw new SavedSearchValidationError('検索条件を保存できませんでした。もう一度お試しください。')
  return [...current, entry]
}

export function readSavedSearches(storage) {
  if (!storage) throw new Error('Storage unavailable')
  const raw = storage.getItem(SAVED_SEARCH_STORAGE_KEY)
  return raw ? normalizeSavedSearches(JSON.parse(raw)) : []
}

export function writeSavedSearches(storage, value) {
  if (!storage) throw new Error('Storage unavailable')
  const normalized = normalizeSavedSearches(value)
  storage.setItem(SAVED_SEARCH_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}
