import { CATALOG_INDEX, getCatalogEntry } from './catalog.js'

export const READING_POSITION_STORAGE_KEY = 'scp-reading-position-v1'

// Build the ordering once. Canonical catalogue insertion order follows source
// order for custom collections, and duplicates/predictions are already removed.
const groups = new Map()
const groupsByBranch = new Map()
const positions = new Map()

function groupKey(branchCode, seriesId) {
  return `${branchCode}:${String(seriesId)}`
}

for (const entry of CATALOG_INDEX.values()) {
  const key = groupKey(entry.branchCode, entry.seriesId)
  if (!groups.has(key)) {
    const group = { branchCode: entry.branchCode, seriesId: entry.seriesId, entries: [] }
    groups.set(key, group)
    if (!groupsByBranch.has(entry.branchCode)) groupsByBranch.set(entry.branchCode, [])
    groupsByBranch.get(entry.branchCode).push(group)
  }
  groups.get(key).entries.push(entry)
}

for (const group of groups.values()) {
  if (group.entries[0]?.series.type !== 'custom') group.entries.sort((a, b) => a.number - b.number)
  group.entries.forEach((entry, index) => positions.set(entry.id, { group, index }))
}

/** Accept only a known published ID, never a stored URL or arbitrary route. */
export function normalizeReadingPosition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.id !== 'string') return null
  const id = value.id.trim()
  return CATALOG_INDEX.has(id) ? { id } : null
}

function firstUnread(group, isRead, start = 0) {
  for (let offset = 0; offset < group.entries.length; offset++) {
    const entry = group.entries[(start + offset) % group.entries.length]
    if (!isRead(entry.id)) return entry
  }
  return null
}

function nextGroups(startingGroup) {
  if (!startingGroup) return [...groups.values()]
  const sameBranch = groupsByBranch.get(startingGroup.branchCode)
  const index = sameBranch.indexOf(startingGroup)
  return [
    ...sameBranch.slice(index + 1),
    ...sameBranch.slice(0, index),
    ...[...groupsByBranch].filter(([branchCode]) => branchCode !== startingGroup.branchCode)
      .flatMap(([, branchGroups]) => branchGroups),
  ]
}

/**
 * Resume the unread current article, then the next unread in its collection.
 * Completed collections advance within the branch before trying other branches.
 * Filtering the visible screen never affects this ordering or publication guard.
 */
export function getResumeEntry(position, checked = new Set(), fallbackSelection = {}) {
  const checkedIds = checked instanceof Set ? checked : new Set(Array.isArray(checked) ? checked : [])
  const isRead = id => checkedIds.has(id)
  const normalized = normalizeReadingPosition(position)
  const current = normalized ? getCatalogEntry(normalized.id) : null
  let startingGroup
  if (current) {
    if (!isRead(current.id)) return current
    const { group, index } = positions.get(current.id)
    startingGroup = group
    const next = firstUnread(group, isRead, index + 1)
    if (next) return next
  } else {
    const branchCode = typeof fallbackSelection?.branchCode === 'string'
      ? fallbackSelection.branchCode.toUpperCase()
      : ''
    startingGroup = groups.get(groupKey(branchCode, fallbackSelection?.seriesId))
      ?? groupsByBranch.get(branchCode)?.[0]
    if (startingGroup) {
      const next = firstUnread(startingGroup, isRead)
      if (next) return next
    }
  }
  for (const group of nextGroups(startingGroup)) {
    const next = firstUnread(group, isRead)
    if (next) return next
  }
  return null
}
