import { useState, useCallback, useRef, useEffect } from 'react'

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
    return true
  } catch {
    return false
  }
}

function applyPatches(base, patches) {
  const next = new Map(base)
  for (const [id, text] of patches) {
    if (text == null) next.delete(id)
    else next.set(id, text)
  }
  return next
}

export function useMemos() {
  const [memos, setMemos] = useState(() => load())
  const timerRef = useRef(null)
  const pendingRef = useRef(new Map())

  const flush = useCallback(() => {
    if (pendingRef.current.size === 0) return
    clearTimeout(timerRef.current)
    const patches = new Map(pendingRef.current)
    const next = applyPatches(load(), patches)
    if (save(next)) {
      for (const [id, text] of patches) {
        if (pendingRef.current.get(id) === text) pendingRef.current.delete(id)
      }
      setMemos(current => applyPatches(next, pendingRef.current))
    }
  }, [])

  // ページ離脱時に未保存のメモを書き込む
  useEffect(() => {
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    window.addEventListener('scp:before-import', flush)
    const sync = event => {
      if (event.key !== STORAGE_KEY) return
      setMemos(applyPatches(load(), pendingRef.current))
    }
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('scp:before-import', flush)
      window.removeEventListener('storage', sync)
      flush()
    }
  }, [flush])

  const setMemo = useCallback((id, text) => {
    const normalizedId = typeof id === 'string' ? id.trim() : ''
    if (!normalizedId || typeof text !== 'string') return
    const nextText = text.trim() ? text : null
    pendingRef.current.set(normalizedId, nextText)
    setMemos(prev => {
      const next = new Map(prev)
      nextText == null ? next.delete(normalizedId) : next.set(normalizedId, text)
      return next
    })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, 300)
  }, [flush])

  const getMemo = useCallback((id) => memos.get(id) ?? '', [memos])

  return { getMemo, setMemo, memos }
}
