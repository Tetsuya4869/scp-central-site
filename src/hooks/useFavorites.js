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

export function withFavoriteValue(previous, rawId, value) {
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!id || typeof value !== 'boolean' || previous.has(id) === value) return previous
  const next = new Set(previous)
  if (value) next.add(id)
  else next.delete(id)
  return next
}

export function useFavorites() {
  const [favorites, setFavoritesState] = useState(() => loadFavorites())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY || event.key === null) setFavoritesState(loadFavorites())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const toggleFavorite = useCallback((id) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId) return
    const next = loadFavorites()
    const isNowFavorite = !next.has(normalizedId)
    if (isNowFavorite) next.add(normalizedId)
    else next.delete(normalizedId)
    saveFavorites(next)
    setFavoritesState(next)
    return isNowFavorite
  }, [])

  const setFavorite = useCallback((id, value) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId || typeof value !== 'boolean') return
    const next = withFavoriteValue(loadFavorites(), normalizedId, value)
    saveFavorites(next)
    setFavoritesState(next)
    return next.has(normalizedId)
  }, [])

  const isFavorite = useCallback((id) => favorites.has(id), [favorites])

  return { favorites, toggleFavorite, setFavorite, isFavorite }
}
