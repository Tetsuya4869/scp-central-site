import { useState, useCallback } from 'react'

const STORAGE_KEY = 'scp-memos-v1'

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

export function useMemos() {
  const [memos, setMemos] = useState(() => load())

  const setMemo = useCallback((id, text) => {
    setMemos(prev => {
      const next = new Map(prev)
      text.trim() ? next.set(id, text) : next.delete(id)
      save(next)
      return next
    })
  }, [])

  const getMemo = useCallback((id) => memos.get(id) ?? '', [memos])

  return { getMemo, setMemo }
}
