import { describe, expect, it, vi } from 'vitest'

// Keep the eager startup fetch in flight until the test explicitly completes
// it. Real JSON imports can finish before Vitest starts running this file.
const titlesLoad = vi.hoisted(() => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
})
vi.mock('./titles.json', async () => ({ default: await titlesLoad.promise }))

import {
  DATA_AUTO_RETRY_DELAYS_MS,
  getDataStatus,
  loadData,
  retryDataLoad,
} from './dataStore.js'

describe('dataStore', () => {
  it('deduplicates an in-flight load and exposes a stable ready status', async () => {
    const first = loadData()
    const second = loadData()

    expect(second).toBe(first)
    expect(getDataStatus()).toMatchObject({ ready: false, loading: true, attempt: 1 })
    titlesLoad.resolve({ EN: { 173: 'The Sculpture' } })
    await expect(first).resolves.toBe(true)
    expect(getDataStatus()).toMatchObject({
      ready: true,
      loading: false,
      error: null,
      retryAt: null,
      canRetry: false,
    })
    expect(getDataStatus()).toBe(getDataStatus())
  })

  it('makes retry idempotent after data is ready', async () => {
    await expect(retryDataLoad()).resolves.toBe(true)
    expect(getDataStatus().ready).toBe(true)
  })

  it('uses a small, finite and increasing retry schedule', () => {
    expect(DATA_AUTO_RETRY_DELAYS_MS).toEqual([1000, 3000, 8000])
  })
})
