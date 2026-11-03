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

export function withCheckedValue(previous, rawId, value) {
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!id || typeof value !== 'boolean' || previous.has(id) === value) return previous
  const next = new Set(previous)
  if (value) next.add(id)
  else next.delete(id)
  return next
}

export function useChecklist() {
  const [checked, setCheckedState] = useState(() => loadChecked())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY || event.key === null) setCheckedState(loadChecked())
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
    setCheckedState(next)
    return isNowChecked
  }, [])

  const setChecked = useCallback((id, value) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId || typeof value !== 'boolean') return
    const next = withCheckedValue(loadChecked(), normalizedId, value)
    saveChecked(next)
    setCheckedState(next)
    return next.has(normalizedId)
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
    setCheckedState(next)
  }, [])

  const isChecked = useCallback((id) => checked.has(id), [checked])

  const countChecked = useCallback(
    (ids) => ids.filter(id => checked.has(id)).length,
    [checked]
  )

  const totalChecked = useMemo(() => checked.size, [checked])

  return { checked, toggle, setChecked, markAll, isChecked, countChecked, totalChecked }
}
