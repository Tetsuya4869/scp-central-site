import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'scp-queue-v1'

export function normalizeQueue(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const normalized = []
  for (const rawId of value) {
    if (typeof rawId !== 'string') continue
    const id = rawId.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    normalized.push(id)
  }
  return normalized
}

function queuesEqual(a, b) {
  return Array.isArray(a) && a.length === b.length && a.every((id, index) => id === b[index])
}

function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const normalized = normalizeQueue(parsed)
    if (!queuesEqual(parsed, normalized)) saveQueue(normalized)
    return normalized
  } catch { return [] }
}

function saveQueue(q) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(q))
  } catch {}
}

function commitQueue(next) {
  saveQueue(next)
  return next
}

export function useQueue() {
  const [queue, setQueue] = useState(() => loadQueue())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY) setQueue(loadQueue())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const addToQueue = useCallback((id) => {
    const normalized = loadQueue()
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId || normalized.includes(normalizedId)) {
      setQueue(normalized)
      return
    }
    setQueue(commitQueue([...normalized, normalizedId]))
  }, [])

  const toggleQueue = useCallback((id) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId) return
    const normalized = loadQueue()
    const next = normalized.includes(normalizedId)
      ? normalized.filter(item => item !== normalizedId)
      : [...normalized, normalizedId]
    setQueue(commitQueue(next))
  }, [])

  const removeFromQueue = useCallback((id) => {
    const normalized = loadQueue()
    const next = normalized.filter(x => x !== id)
    if (!queuesEqual(normalized, next)) commitQueue(next)
    setQueue(next)
  }, [])

  const moveUp = useCallback((id) => {
    const normalized = loadQueue()
    const idx = normalized.indexOf(id)
    if (idx <= 0) {
      setQueue(normalized)
      return
    }
    const next = [...normalized]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setQueue(commitQueue(next))
  }, [])

  const moveDown = useCallback((id) => {
    const normalized = loadQueue()
    const idx = normalized.indexOf(id)
    if (idx === -1 || idx >= normalized.length - 1) {
      setQueue(normalized)
      return
    }
    const next = [...normalized]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setQueue(commitQueue(next))
  }, [])

  // Catalog-aware callers can pass a predicate or iterable of known IDs to
  // remove entries that no longer resolve. With no argument this still cleans
  // malformed and duplicate persisted entries.
  const pruneQueue = useCallback((validIdsOrPredicate) => {
    const previous = loadQueue()
    let next = normalizeQueue(previous)
    if (typeof validIdsOrPredicate === 'function') {
      next = next.filter(validIdsOrPredicate)
    } else if (validIdsOrPredicate != null) {
      const values = typeof validIdsOrPredicate === 'string'
        ? [validIdsOrPredicate]
        : validIdsOrPredicate
      if (typeof values?.[Symbol.iterator] === 'function') {
        const validIds = new Set([...values].map(String))
        next = next.filter(id => validIds.has(id))
      }
    }
    if (!queuesEqual(previous, next)) commitQueue(next)
    setQueue(next)
  }, [])

  const isQueued = useCallback((id) => queue.includes(id), [queue])

  return { queue, addToQueue, removeFromQueue, toggleQueue, moveUp, moveDown, pruneQueue, isQueued }
}
