import { useState, useCallback } from 'react'

const STORAGE_KEY = 'scp-user-ratings-v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    return new Map(Object.entries(JSON.parse(raw)).map(([k, v]) => [k, Number(v)]))
  } catch { return new Map() }
}

function save(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)))
}

export function useUserRatings() {
  const [ratings, setRatings] = useState(() => load())

  const setRating = useCallback((id, value) => {
    setRatings(prev => {
      const next = new Map(prev)
      if (value == null || value === 0) {
        next.delete(id)
      } else {
        next.set(id, value)
      }
      save(next)
      return next
    })
  }, [])

  const getRating = useCallback((id) => ratings.get(id) ?? null, [ratings])
  const hasRating = useCallback((id) => ratings.has(id), [ratings])

  return { userRatings: ratings, setRating, getRating, hasRating }
}
