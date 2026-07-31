import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'scp-user-ratings-v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    return new Map(Object.entries(JSON.parse(raw))
      .map(([k, v]) => [k, Number(v)])
      .filter(([id, value]) => id && Number.isInteger(value) && value >= 1 && value <= 5))
  } catch { return new Map() }
}

function save(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)))
  } catch {}
}

export function useUserRatings() {
  const [ratings, setRatings] = useState(() => load())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY) setRatings(load())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const setRating = useCallback((id, value) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId) return
    const shouldClear = value == null || value === 0
    const normalizedValue = Number(value)
    if (!shouldClear && (!Number.isInteger(normalizedValue) || normalizedValue < 1 || normalizedValue > 5)) return
    const next = load()
    if (shouldClear) next.delete(normalizedId)
    else next.set(normalizedId, normalizedValue)
    save(next)
    setRatings(next)
  }, [])

  const getRating = useCallback((id) => ratings.get(id) ?? null, [ratings])
  const hasRating = useCallback((id) => ratings.has(id), [ratings])

  return { userRatings: ratings, setRating, getRating, hasRating }
}
