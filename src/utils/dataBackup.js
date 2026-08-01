import { normalizeTimestamp } from './timestamps.js'

const KEYS = Object.freeze({
  checklist:   'scp-checklist-v1',
  favorites:   'scp-favorites-v1',
  memos:       'scp-memos-v1',
  readDates:   'scp-readdates-v1',
  queue:       'scp-queue-v1',
  goal:        'scp-goal-v1',
  layout:      'scp-layout',
  theme:       'scp-theme',
  lastView:    'scp-last-view',
  toast:       'scp-toast-pending',
})

const SESSION_KEYS = Object.freeze({
  activeReading: 'scp-active-reading',
})

const BACKUP_FIELDS = Object.freeze([
  'checklist',
  'favorites',
  'memos',
  'readDates',
  'queue',
  'goal',
  'layout',
  'theme',
  'lastView',
])

const LAYOUTS = new Set(['list', 'card', 'matrix'])
const THEMES = new Set(['dark', 'light'])

// Keep retired app keys here so "all data" cleanup also removes orphaned data
// without restoring the removed feature to backup/import flows.
export const APP_LOCAL_STORAGE_KEYS = Object.freeze([...Object.values(KEYS), 'scp-user-ratings-v1'])
export const APP_SESSION_STORAGE_KEYS = Object.freeze(Object.values(SESSION_KEYS))

function isRecord(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function normalizeId(value) {
  if (typeof value !== 'string') return null
  const id = value.trim()
  if (
    !id ||
    id.length > 512 ||
    /[\u0000-\u001f\u007f]/.test(id) ||
    id === 'null' ||
    id === 'undefined' ||
    id === '__proto__' ||
    id === 'prototype' ||
    id === 'constructor'
  ) return null
  return id
}

function sanitizeIdArray(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const result = []
  for (const candidate of value) {
    const id = normalizeId(candidate)
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

function sanitizeIdMap(value, sanitizeValue) {
  const result = Object.create(null)
  if (!isRecord(value)) return result
  for (const [candidateId, candidateValue] of Object.entries(value)) {
    const id = normalizeId(candidateId)
    if (!id) continue
    const sanitizedValue = sanitizeValue(candidateValue)
    if (sanitizedValue !== undefined) result[id] = sanitizedValue
  }
  return result
}

function sanitizeMemo(value) {
  return typeof value === 'string' ? value : undefined
}

function sanitizeReadDate(value) {
  return normalizeTimestamp(value)
}

function sanitizeGoal(value) {
  if (!isRecord(value)) return null
  if (value.monthly == null) return { monthly: null }
  const monthly = Number(value.monthly)
  return Number.isInteger(monthly) && monthly > 0 && monthly <= 9999
    ? { monthly }
    : { monthly: null }
}

function sanitizeLastView(value) {
  if (!isRecord(value)) return null

  const branchCode = value.branchCode == null
    ? null
    : typeof value.branchCode === 'string' && value.branchCode.trim().length <= 16
      ? value.branchCode.trim().toUpperCase()
      : null
  const view = value.view == null
    ? null
    : typeof value.view === 'string' && value.view.trim().length <= 32
      ? value.view.trim()
      : null
  const seriesId = typeof value.seriesId === 'number' && Number.isFinite(value.seriesId)
    ? value.seriesId
    : typeof value.seriesId === 'string' && value.seriesId.trim().length <= 128
      ? value.seriesId.trim()
      : null

  return { branchCode, view, seriesId, targetId: null }
}

function parseStoredJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function requireFieldType(data, field, expected) {
  if (!(field in data)) return
  const value = data[field]
  const valid = expected === 'array'
    ? Array.isArray(value)
    : expected === 'record'
      ? isRecord(value)
      : typeof value === expected
  if (!valid) {
    const label = expected === 'record' ? 'オブジェクト' : expected === 'array' ? '配列' : '文字列'
    throw new Error(`バックアップの「${field}」は${label}である必要があります。`)
  }
}

function parseBackup(jsonText) {
  if (typeof jsonText !== 'string') {
    throw new Error('バックアップはJSON文字列で指定してください。')
  }

  let data
  try {
    data = JSON.parse(jsonText)
  } catch (error) {
    throw new Error(`バックアップJSONを解析できません: ${error.message}`)
  }

  if (!isRecord(data)) throw new Error('バックアップの最上位はオブジェクトである必要があります。')
  if (data.version !== 1) throw new Error('対応していないバックアップ形式です（version 1 が必要です）。')
  if (!BACKUP_FIELDS.some(field => field in data)) {
    throw new Error('バックアップに復元できるデータが含まれていません。')
  }

  requireFieldType(data, 'checklist', 'array')
  requireFieldType(data, 'favorites', 'array')
  requireFieldType(data, 'queue', 'array')
  requireFieldType(data, 'memos', 'record')
  requireFieldType(data, 'readDates', 'record')
  requireFieldType(data, 'goal', 'record')
  requireFieldType(data, 'layout', 'string')
  requireFieldType(data, 'theme', 'string')
  requireFieldType(data, 'lastView', 'record')

  return {
    checklist: 'checklist' in data ? sanitizeIdArray(data.checklist) : null,
    favorites: 'favorites' in data ? sanitizeIdArray(data.favorites) : null,
    memos: 'memos' in data ? sanitizeIdMap(data.memos, sanitizeMemo) : null,
    readDates: 'readDates' in data ? sanitizeIdMap(data.readDates, sanitizeReadDate) : null,
    queue: 'queue' in data ? sanitizeIdArray(data.queue) : null,
    goal: 'goal' in data ? sanitizeGoal(data.goal) : null,
    layout: 'layout' in data && LAYOUTS.has(data.layout) ? data.layout : null,
    theme: 'theme' in data && THEMES.has(data.theme) ? data.theme : null,
    lastView: 'lastView' in data ? sanitizeLastView(data.lastView) : null,
  }
}

function mergeArrays(existing, imported) {
  return sanitizeIdArray([...sanitizeIdArray(existing), ...imported])
}

function mergeMaps(existing, imported, sanitizeValue) {
  return Object.assign(
    Object.create(null),
    sanitizeIdMap(existing, sanitizeValue),
    imported,
  )
}

export function createBackupData(storage = localStorage, now = new Date()) {
  const goal = sanitizeGoal(parseStoredJson(storage, KEYS.goal, { monthly: null }))
  const lastView = sanitizeLastView(parseStoredJson(storage, KEYS.lastView, {}))
  const layout = storage.getItem(KEYS.layout)
  const theme = storage.getItem(KEYS.theme)

  return {
    version: 1,
    exportedAt: now.toISOString(),
    checklist: sanitizeIdArray(parseStoredJson(storage, KEYS.checklist, [])),
    favorites: sanitizeIdArray(parseStoredJson(storage, KEYS.favorites, [])),
    memos: sanitizeIdMap(parseStoredJson(storage, KEYS.memos, {}), sanitizeMemo),
    readDates: sanitizeIdMap(parseStoredJson(storage, KEYS.readDates, {}), sanitizeReadDate),
    queue: sanitizeIdArray(parseStoredJson(storage, KEYS.queue, [])),
    goal: goal ?? { monthly: null },
    layout: LAYOUTS.has(layout) ? layout : 'list',
    theme: THEMES.has(theme) ? theme : 'dark',
    lastView: lastView ?? { branchCode: null, view: null, seriesId: null, targetId: null },
  }
}

export function exportData() {
  const data = createBackupData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scp-checklist-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  try {
    a.click()
  } finally {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

export function importData(jsonText, storage = localStorage) {
  // Parse, validate, and sanitize every field before performing any write so a
  // malformed late field cannot leave a half-imported backup behind.
  const data = parseBackup(jsonText)

  if (data.checklist) {
    const existing = parseStoredJson(storage, KEYS.checklist, [])
    storage.setItem(KEYS.checklist, JSON.stringify(mergeArrays(existing, data.checklist)))
  }
  if (data.favorites) {
    const existing = parseStoredJson(storage, KEYS.favorites, [])
    storage.setItem(KEYS.favorites, JSON.stringify(mergeArrays(existing, data.favorites)))
  }
  if (data.memos) {
    const existing = parseStoredJson(storage, KEYS.memos, {})
    storage.setItem(KEYS.memos, JSON.stringify(mergeMaps(existing, data.memos, sanitizeMemo)))
  }
  if (data.readDates) {
    const existing = parseStoredJson(storage, KEYS.readDates, {})
    storage.setItem(KEYS.readDates, JSON.stringify(mergeMaps(existing, data.readDates, sanitizeReadDate)))
  }
  if (data.queue) {
    const existing = parseStoredJson(storage, KEYS.queue, [])
    storage.setItem(KEYS.queue, JSON.stringify(mergeArrays(existing, data.queue)))
  }
  if (data.goal) storage.setItem(KEYS.goal, JSON.stringify(data.goal))
  if (data.layout) storage.setItem(KEYS.layout, data.layout)
  if (data.theme) storage.setItem(KEYS.theme, data.theme)
  if (data.lastView) storage.setItem(KEYS.lastView, JSON.stringify(data.lastView))
}

export function clearAppStorage(
  local = typeof localStorage === 'undefined' ? null : localStorage,
  session = typeof sessionStorage === 'undefined' ? null : sessionStorage,
) {
  for (const key of APP_LOCAL_STORAGE_KEYS) {
    try { local?.removeItem(key) } catch { /* continue clearing other known keys */ }
  }
  for (const key of APP_SESSION_STORAGE_KEYS) {
    try { session?.removeItem(key) } catch { /* continue clearing other known keys */ }
  }
}
