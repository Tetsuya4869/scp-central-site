import { describe, expect, it } from 'vitest'
import {
  APP_LOCAL_STORAGE_KEYS,
  APP_SESSION_STORAGE_KEYS,
  clearAppStorage,
  createBackupData,
  importData,
} from './dataBackup.js'

class MemoryStorage {
  constructor(entries = {}) {
    this.values = new Map(Object.entries(entries))
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }
}

describe('data backup', () => {
  it('exports reading data together with the current app settings', () => {
    const storage = new MemoryStorage({
      'scp-checklist-v1': JSON.stringify(['EN-1', null, 'EN-1']),
      'scp-queue-v1': JSON.stringify(['JP-2', 'JP-2', 42]),
      'scp-user-ratings-v1': JSON.stringify({ 'EN-1': 5, 'JP-2': 99 }),
      'scp-goal-v1': JSON.stringify({ monthly: 12 }),
      'scp-layout': 'card',
      'scp-theme': 'light',
      'scp-last-view': JSON.stringify({ branchCode: 'jp', view: 'series', seriesId: 'tales-jp' }),
    })

    const data = createBackupData(storage, new Date('2026-08-01T00:00:00.000Z'))

    expect(data).toMatchObject({
      version: 1,
      exportedAt: '2026-08-01T00:00:00.000Z',
      checklist: ['EN-1'],
      queue: ['JP-2'],
      userRatings: { 'EN-1': 5 },
      goal: { monthly: 12 },
      layout: 'card',
      theme: 'light',
      lastView: { branchCode: 'JP', view: 'series', seriesId: 'tales-jp', targetId: null },
    })
  })

  it('sanitizes imported IDs and map values before merging', () => {
    const storage = new MemoryStorage({
      'scp-checklist-v1': JSON.stringify(['EN-1']),
      'scp-memos-v1': JSON.stringify({ 'EN-1': 'existing' }),
      'scp-queue-v1': JSON.stringify(['EN-1']),
    })
    const backup = JSON.stringify({
      version: 1,
      checklist: [' JP-2 ', null, 42, '', 'JP-2'],
      favorites: ['JP-2', undefined, 'null'],
      memos: { 'JP-2': 'memo', 'CN-3': 3, null: 'bad' },
      readDates: {
        'JP-2': '1722470400000',
        'CN-3': 'not-a-date',
        'EN-173': 1e308,
      },
      queue: ['JP-2', null, 'EN-1'],
      userRatings: { 'JP-2': '4', 'CN-3': 7 },
      goal: { monthly: 20 },
      layout: 'matrix',
      theme: 'dark',
      lastView: { branchCode: 'jp', view: 'series', seriesId: 'tales-jp', targetId: 'ignored' },
    })

    importData(backup, storage)

    expect(JSON.parse(storage.getItem('scp-checklist-v1'))).toEqual(['EN-1', 'JP-2'])
    expect(JSON.parse(storage.getItem('scp-favorites-v1'))).toEqual(['JP-2'])
    expect(JSON.parse(storage.getItem('scp-memos-v1'))).toEqual({ 'EN-1': 'existing', 'JP-2': 'memo' })
    expect(JSON.parse(storage.getItem('scp-readdates-v1'))).toEqual({ 'JP-2': 1722470400000 })
    expect(JSON.parse(storage.getItem('scp-queue-v1'))).toEqual(['EN-1', 'JP-2'])
    expect(JSON.parse(storage.getItem('scp-user-ratings-v1'))).toEqual({ 'JP-2': 4 })
    expect(JSON.parse(storage.getItem('scp-goal-v1'))).toEqual({ monthly: 20 })
    expect(storage.getItem('scp-layout')).toBe('matrix')
    expect(storage.getItem('scp-theme')).toBe('dark')
    expect(JSON.parse(storage.getItem('scp-last-view'))).toEqual({
      branchCode: 'JP', view: 'series', seriesId: 'tales-jp', targetId: null,
    })
  })

  it('rejects an invalid top-level schema before changing storage', () => {
    const storage = new MemoryStorage({ unrelated: 'keep' })

    expect(() => importData('[]', storage)).toThrow('最上位はオブジェクト')
    expect(() => importData(JSON.stringify({ version: 1, queue: {} }), storage)).toThrow('「queue」は配列')
    expect(() => importData(JSON.stringify({ version: 1 }), storage)).toThrow('復元できるデータ')
    expect(storage.getItem('unrelated')).toBe('keep')
  })

  it('keeps version-1 backups with only legacy fields compatible', () => {
    const storage = new MemoryStorage()

    importData(JSON.stringify({ version: 1, checklist: ['EN-173'] }), storage)

    expect(JSON.parse(storage.getItem('scp-checklist-v1'))).toEqual(['EN-173'])
    expect(storage.getItem('scp-theme')).toBeNull()
  })

  it('clears only this app known keys and preserves unrelated storage', () => {
    const local = new MemoryStorage({ unrelated: 'keep' })
    const session = new MemoryStorage({ unrelatedSession: 'keep' })
    for (const key of APP_LOCAL_STORAGE_KEYS) local.setItem(key, 'value')
    for (const key of APP_SESSION_STORAGE_KEYS) session.setItem(key, 'value')

    clearAppStorage(local, session)

    expect(local.getItem('unrelated')).toBe('keep')
    expect(session.getItem('unrelatedSession')).toBe('keep')
    for (const key of APP_LOCAL_STORAGE_KEYS) expect(local.getItem(key)).toBeNull()
    for (const key of APP_SESSION_STORAGE_KEYS) expect(session.getItem(key)).toBeNull()
  })
})
