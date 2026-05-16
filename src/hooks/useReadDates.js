import { useState, useCallback } from 'react'

const STORAGE_KEY = 'scp-readdates-v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Map(Object.entries(JSON.parse(raw))) : new Map()
  } catch {
    return new Map()
  }
}

function save(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(map)))
  } catch {}
}

export function useReadDates() {
  const [dates, setDates] = useState(() => load())

  const setReadDate = useCallback((id) => {
    setDates(prev => {
      const next = new Map(prev)
      next.set(id, Date.now())
      save(next)
      return next
    })
  }, [])

  const clearReadDate = useCallback((id) => {
    setDates(prev => {
      const next = new Map(prev)
      next.delete(id)
      save(next)
      return next
    })
  }, [])

  const getReadDate = useCallback((id) => {
    const ts = dates.get(id)
    return ts ? new Date(ts) : null
  }, [dates])

  return { setReadDate, clearReadDate, getReadDate }
}
