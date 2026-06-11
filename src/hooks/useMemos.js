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
  } catch {}
}

export function useMemos() {
  const [memos, setMemos] = useState(() => load())
  const timerRef = useRef(null)
  const pendingRef = useRef(null)

  const flush = useCallback(() => {
    if (pendingRef.current == null) return
    clearTimeout(timerRef.current)
    save(pendingRef.current)
    pendingRef.current = null
  }, [])

  // ページ離脱時に未保存のメモを書き込む
  useEffect(() => {
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const setMemo = useCallback((id, text) => {
    setMemos(prev => {
      const next = new Map(prev)
      text.trim() ? next.set(id, text) : next.delete(id)
      pendingRef.current = next
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        save(next)
        pendingRef.current = null
      }, 300)
      return next
    })
  }, [])

  const getMemo = useCallback((id) => memos.get(id) ?? '', [memos])

  return { getMemo, setMemo, memos }
}
