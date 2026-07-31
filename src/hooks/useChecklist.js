import { useState, useCallback, useEffect, useMemo } from 'react'

const STORAGE_KEY = 'scp-checklist-v1'

function loadChecked() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveChecked(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // storage full — silently ignore
  }
}

export function useChecklist() {
  const [checked, setChecked] = useState(() => loadChecked())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY) setChecked(loadChecked())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const toggle = useCallback((id) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId) return
    const next = loadChecked()
    let isNowChecked
    if (next.has(normalizedId)) {
      next.delete(normalizedId)
      isNowChecked = false
    } else {
      next.add(normalizedId)
      isNowChecked = true
    }
    saveChecked(next)
    setChecked(next)
    return isNowChecked
  }, [])

  const markAll = useCallback((ids, value) => {
    if (!ids || typeof ids[Symbol.iterator] !== 'function') return
    const next = loadChecked()
    for (const rawId of ids) {
      const id = typeof rawId === 'string' ? rawId.trim() : ''
      if (!id) continue
      if (value) next.add(id)
      else next.delete(id)
    }
    saveChecked(next)
    setChecked(next)
  }, [])

  const isChecked = useCallback((id) => checked.has(id), [checked])

  const countChecked = useCallback(
    (ids) => ids.filter(id => checked.has(id)).length,
    [checked]
  )

  const totalChecked = useMemo(() => checked.size, [checked])

  return { checked, toggle, markAll, isChecked, countChecked, totalChecked }
}
