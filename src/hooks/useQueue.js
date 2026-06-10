import { useState, useCallback } from 'react'

const STORAGE_KEY = 'scp-queue-v1'

function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveQueue(q) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q))
}

export function useQueue() {
  const [queue, setQueue] = useState(() => loadQueue())

  const addToQueue = useCallback((id) => {
    setQueue(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      saveQueue(next)
      return next
    })
  }, [])

  const removeFromQueue = useCallback((id) => {
    setQueue(prev => {
      const next = prev.filter(x => x !== id)
      saveQueue(next)
      return next
    })
  }, [])

  const moveUp = useCallback((id) => {
    setQueue(prev => {
      const idx = prev.indexOf(id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      saveQueue(next)
      return next
    })
  }, [])

  const moveDown = useCallback((id) => {
    setQueue(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      saveQueue(next)
      return next
    })
  }, [])

  const isQueued = useCallback((id) => queue.includes(id), [queue])

  return { queue, addToQueue, removeFromQueue, moveUp, moveDown, isQueued }
}
