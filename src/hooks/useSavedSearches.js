import { useCallback, useEffect, useState } from 'react'
import {
  SAVED_SEARCH_STORAGE_KEY, SavedSearchValidationError,
  addSavedSearch, readSavedSearches, writeSavedSearches,
} from '../utils/savedSearches.js'

const READ_ERROR = '保存した検索条件を読み込めませんでした。ブラウザの保存設定を確認してください。'
const WRITE_ERROR = '検索条件を保存できませんでした。ブラウザの保存容量や設定を確認してください。'

function getStorage() {
  try { return localStorage } catch { return null }
}

function load() {
  try { return { savedSearches: readSavedSearches(getStorage()), error: '' } }
  catch { return { savedSearches: [], error: READ_ERROR } }
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `search-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function useSavedSearches() {
  const [snapshot, setSnapshot] = useState(load)

  useEffect(() => {
    const sync = event => {
      if (event.key !== SAVED_SEARCH_STORAGE_KEY && event.key !== null) return
      const next = load()
      setSnapshot(previous => next.error ? { ...previous, error: next.error } : next)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const saveSearch = useCallback((name, filters) => {
    try {
      const storage = getStorage()
      const current = readSavedSearches(storage)
      const id = createId()
      const next = writeSavedSearches(storage, addSavedSearch(current, { id, name, filters }))
      setSnapshot({ savedSearches: next, error: '' })
      return { ok: true, preset: next.find(item => item.id === id) }
    } catch (error) {
      const message = error instanceof SavedSearchValidationError ? error.message : WRITE_ERROR
      setSnapshot(previous => ({ ...previous, error: message }))
      return { ok: false, error: message }
    }
  }, [])

  const deleteSearch = useCallback(id => {
    try {
      const storage = getStorage()
      const current = readSavedSearches(storage)
      const next = writeSavedSearches(storage, current.filter(item => item.id !== id))
      setSnapshot({ savedSearches: next, error: '' })
      return { ok: true }
    } catch {
      const message = '検索条件を削除できませんでした。ブラウザの保存設定を確認してください。'
      setSnapshot(previous => ({ ...previous, error: message }))
      return { ok: false, error: message }
    }
  }, [])

  const clearError = useCallback(() => {
    setSnapshot(previous => previous.error ? { ...previous, error: '' } : previous)
  }, [])

  return { ...snapshot, saveSearch, deleteSearch, clearError }
}
