import { useCallback, useEffect, useState } from 'react'
import { normalizeReadingPosition, READING_POSITION_STORAGE_KEY } from '../utils/readingPosition.js'

function loadPosition() {
  try {
    return normalizeReadingPosition(JSON.parse(localStorage.getItem(READING_POSITION_STORAGE_KEY) || 'null'))
  } catch {
    return null
  }
}

export function useReadingPosition() {
  const [position, setPosition] = useState(loadPosition)

  useEffect(() => {
    const sync = event => {
      if (event.key === READING_POSITION_STORAGE_KEY || event.key === null) setPosition(loadPosition())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const recordArticle = useCallback(id => {
    const next = normalizeReadingPosition({ id })
    if (!next) return null
    try { localStorage.setItem(READING_POSITION_STORAGE_KEY, JSON.stringify(next)) } catch {}
    setPosition(next)
    return next
  }, [])

  return { position, recordArticle }
}
