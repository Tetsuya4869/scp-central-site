import { useState, useCallback, useMemo } from 'react'

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

  const toggle = useCallback((id) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      saveChecked(next)
      return next
    })
  }, [])

  const markAll = useCallback((ids, value) => {
    setChecked(prev => {
      const next = new Set(prev)
      ids.forEach(id => value ? next.add(id) : next.delete(id))
      saveChecked(next)
      return next
    })
  }, [])

  const isChecked = useCallback((id) => checked.has(id), [checked])

  const countChecked = useCallback(
    (ids) => ids.filter(id => checked.has(id)).length,
    [checked]
  )

  const totalChecked = useMemo(() => checked.size, [checked])

  return { checked, toggle, markAll, isChecked, countChecked, totalChecked }
}
