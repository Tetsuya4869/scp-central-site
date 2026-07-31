import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'scp-favorites-v1'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {}
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => loadFavorites())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY) setFavorites(loadFavorites())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const toggleFavorite = useCallback((id) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId) return
    const next = loadFavorites()
    next.has(normalizedId) ? next.delete(normalizedId) : next.add(normalizedId)
    saveFavorites(next)
    setFavorites(next)
  }, [])

  const isFavorite = useCallback((id) => favorites.has(id), [favorites])

  return { favorites, toggleFavorite, isFavorite }
}
