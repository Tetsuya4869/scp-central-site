import { describe, expect, it } from 'vitest'

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
    expect(getDataStatus().loading || getDataStatus().ready).toBe(true)
    await expect(first).resolves.toBe(true)
    expect(getDataStatus()).toMatchObject({
      ready: true,
      loading: false,
      error: null,
      retryAt: null,
      canRetry: false,
    })
  })

  it('makes retry idempotent after data is ready', async () => {
    await expect(retryDataLoad()).resolves.toBe(true)
    expect(getDataStatus().ready).toBe(true)
  })

  it('uses a small, finite and increasing retry schedule', () => {
    expect(DATA_AUTO_RETRY_DELAYS_MS).toEqual([1000, 3000, 8000])
  })
})
