import { useSyncExternalStore } from 'react'

/**
 * Large article metadata files are loaded as separate dynamic chunks. The
 * ready hook preserves the original boolean API, while the status hook lets a
 * caller surface and manually recover from a transient chunk/network failure.
 */

let _titles = {}
let _charCounts = {}
let _ratings = {}
let _loaded = false
let _promise = null
let _retryTimer = null
let _autoRetriesUsed = 0
let _attempt = 0

export const DATA_AUTO_RETRY_DELAYS_MS = Object.freeze([1000, 3000, 8000])

let _status = Object.freeze({
  ready: false,
  loading: false,
  error: null,
  attempt: 0,
  retryAt: null,
  canRetry: true,
})

const _subs = new Set()

export const getTitles = () => _titles
export const getCharCounts = () => _charCounts
export const getRatings = () => _ratings
export const getDataStatus = () => _status

function subscribe(fn) {
  _subs.add(fn)
  return () => _subs.delete(fn)
}

function publishStatus(patch) {
  _status = Object.freeze({ ..._status, ...patch })
  _subs.forEach(fn => fn())
}

function clearRetryTimer() {
  if (_retryTimer !== null) {
    clearTimeout(_retryTimer)
    _retryTimer = null
  }
}

function scheduleAutoRetry() {
  if (_loaded || _retryTimer !== null) return

  const delay = DATA_AUTO_RETRY_DELAYS_MS[_autoRetriesUsed]
  if (delay === undefined) {
    publishStatus({ retryAt: null, canRetry: true })
    return
  }

  _autoRetriesUsed += 1
  const retryAt = Date.now() + delay
  publishStatus({ retryAt, canRetry: true })
  _retryTimer = setTimeout(() => {
    _retryTimer = null
    loadData()
  }, delay)
}

const readySnapshot = () => _loaded

export function loadData() {
  if (_loaded) return Promise.resolve(true)
  if (_promise) return _promise

  clearRetryTimer()
  _attempt += 1
  publishStatus({ loading: true, attempt: _attempt, retryAt: null })

  _promise = Promise.all([
    import('./titles.json'),
    import('./char_counts.json'),
    import('./ratings.json'),
  ])
    .then(([titles, charCounts, ratings]) => {
      _titles = titles.default
      _charCounts = charCounts.default
      _ratings = ratings.default
      _loaded = true
      _promise = null
      _autoRetriesUsed = 0
      clearRetryTimer()
      publishStatus({
        ready: true,
        loading: false,
        error: null,
        retryAt: null,
        canRetry: false,
      })
      return true
    })
    .catch(error => {
      _promise = null
      publishStatus({
        ready: false,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        retryAt: null,
        canRetry: true,
      })
      console.error('data load failed', error)
      scheduleAutoRetry()
      return false
    })

  return _promise
}

export function retryDataLoad() {
  if (_loaded) return Promise.resolve(true)
  clearRetryTimer()
  _autoRetriesUsed = 0
  publishStatus({ retryAt: null, canRetry: true })
  return loadData()
}

export function useDataReady() {
  return useSyncExternalStore(subscribe, readySnapshot, readySnapshot)
}

export function useDataStatus() {
  return useSyncExternalStore(subscribe, getDataStatus, getDataStatus)
}

// Start fetching alongside the initial React render.
loadData()
