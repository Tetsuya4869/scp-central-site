import { useState, useCallback, useEffect } from 'react'
import { normalizeTimestamp, normalizeTimestampRecord } from '../utils/timestamps.js'

const STORAGE_KEY = 'scp-readdates-v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    return normalizeTimestampRecord(JSON.parse(raw))
  } catch {
    return new Map()
  }
}

function save(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)))
  } catch {}
}

function normalizeIds(ids) {
  const values = typeof ids === 'string' || typeof ids === 'number' ? [ids] : ids
  if (!values || typeof values[Symbol.iterator] !== 'function') return []
  return [...new Set([...values].filter(id => id != null).map(String).filter(Boolean))]
}

export function mergeReadDates(previous, ids, timestamp, { overwriteExisting = false } = {}) {
  const normalizedIds = normalizeIds(ids)
  const normalizedTimestamp = normalizeTimestamp(timestamp)
  if (!normalizedIds.length || normalizedTimestamp === undefined) return previous
  let next = null
  for (const id of normalizedIds) {
    if (!overwriteExisting && previous.has(id)) continue
    if (previous.get(id) === normalizedTimestamp) continue
    if (!next) next = new Map(previous)
    next.set(id, normalizedTimestamp)
  }
  return next ?? previous
}

export function removeReadDates(previous, ids) {
  const normalizedIds = normalizeIds(ids)
  if (!normalizedIds.length) return previous
  let next = null
  for (const id of normalizedIds) {
    if (!previous.has(id)) continue
    if (!next) next = new Map(previous)
    next.delete(id)
  }
  return next ?? previous
}

export function useReadDates() {
  const [dates, setDates] = useState(() => load())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY) setDates(load())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const setReadDate = useCallback((id, timestamp = Date.now()) => {
    const [normalizedId] = normalizeIds(id)
    if (!normalizedId) return
    const previous = load()
    const next = mergeReadDates(previous, normalizedId, timestamp, { overwriteExisting: true })
    if (next !== previous) save(next)
    setDates(next)
  }, [])

  const clearReadDate = useCallback((id) => {
    const [normalizedId] = normalizeIds(id)
    if (!normalizedId) return
    const previous = load()
    const next = removeReadDates(previous, normalizedId)
    if (next !== previous) save(next)
    setDates(next)
  }, [])

  // Adds many read dates in one state transition and one storage write.
  // Existing dates are preserved by default so bulk marking cannot rewrite
  // reading history. Pass { overwriteExisting: true } only for an explicit edit.
  const setReadDatesBatch = useCallback((ids, timestamp = Date.now(), options = {}) => {
    const previous = load()
    const next = mergeReadDates(previous, ids, timestamp, options)
    if (next !== previous) save(next)
    setDates(next)
  }, [])

  const clearReadDatesBatch = useCallback((ids) => {
    const previous = load()
    const next = removeReadDates(previous, ids)
    if (next !== previous) save(next)
    setDates(next)
  }, [])

  const getReadDate = useCallback((id) => {
    const ts = dates.get(id)
    return ts ? new Date(ts) : null
  }, [dates])

  return {
    setReadDate,
    clearReadDate,
    setReadDates: setReadDatesBatch,
    clearReadDates: clearReadDatesBatch,
    setReadDatesBatch,
    clearReadDatesBatch,
    getReadDate,
    dates,
  }
}
