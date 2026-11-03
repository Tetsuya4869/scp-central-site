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
      'scp-user-ratings-v1': JSON.stringify({ 'EN-1': 5 }),
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
      goal: { monthly: 12 },
      layout: 'card',
      theme: 'light',
      lastView: { branchCode: 'JP', view: 'series', seriesId: 'tales-jp', targetId: null },
    })
    expect(data).not.toHaveProperty('userRatings')
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
      userRatings: { 'JP-2': 4 },
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
    expect(storage.getItem('scp-user-ratings-v1')).toBeNull()
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

describe('reading position and saved searches in compatible backups', () => {
  const preset = (id, name = id) => ({ id, name, filters: { query: '世界', branchCode: 'JP', seriesId: 'tales-jp', readFilter: 'unread', favoritesOnly: false, sortBy: 'rating-desc' } })

  it('exports and restores real reading position and exact search conditions in version1', () => {
    const source = new MemoryStorage({
      'scp-reading-position-v1': JSON.stringify({ id: 'EN-173', url: 'ignored' }),
      'scp-saved-searches-v1': JSON.stringify([preset('saved-a')]),
      'scp-checklist-v1': JSON.stringify(['JP-1']),
    })
    const backup = createBackupData(source)
    expect(backup.version).toBe(1)
    expect(backup.readingPosition).toEqual({ id: 'EN-173' })
    expect(backup.savedSearches).toEqual([preset('saved-a')])
    const destination = new MemoryStorage({ 'scp-saved-searches-v1': JSON.stringify([preset('existing')]) })
    expect(importData(JSON.stringify(backup), destination)).toEqual({ savedSearchesSkipped: 0 })
    expect(JSON.parse(destination.getItem('scp-reading-position-v1'))).toEqual({ id: 'EN-173' })
    expect(JSON.parse(destination.getItem('scp-saved-searches-v1')).map(item => item.id)).toEqual(['existing', 'saved-a'])
  })

  it('keeps new preferences when importing an older backup and rejects malformed additions before writes', () => {
    const position = JSON.stringify({ id: 'JP-173' })
    const saved = JSON.stringify([preset('keep')])
    const storage = new MemoryStorage({ 'scp-reading-position-v1': position, 'scp-saved-searches-v1': saved })
    importData(JSON.stringify({ version: 1, checklist: ['EN-1'] }), storage)
    expect(storage.getItem('scp-reading-position-v1')).toBe(position)
    expect(storage.getItem('scp-saved-searches-v1')).toBe(saved)
    expect(() => importData(JSON.stringify({ version: 1, checklist: ['JP-2'], savedSearches: {} }), storage)).toThrow('savedSearches')
    expect(() => importData(JSON.stringify({ version: 1, checklist: ['JP-2'], readingPosition: 'JP-2' }), storage)).toThrow('readingPosition')
    expect(JSON.parse(storage.getItem('scp-checklist-v1'))).toEqual(['EN-1'])
    importData(JSON.stringify({ version: 1, readingPosition: { id: 'demo-jp-001' } }), storage)
    expect(storage.getItem('scp-reading-position-v1')).toBe(position)
  })

  it('merges preset IDs without duplicating them and reports only actual capacity omissions', () => {
    const storage = new MemoryStorage({ 'scp-saved-searches-v1': JSON.stringify(['a', 'b', 'c', 'd', 'e'].map(id => preset(id))) })
    const result = importData(JSON.stringify({ version: 1, savedSearches: [preset('a', 'updated'), preset('f')] }), storage)
    const saved = JSON.parse(storage.getItem('scp-saved-searches-v1'))
    expect(saved.map(item => item.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(saved[0].name).toBe('updated')
    expect(result.savedSearchesSkipped).toBe(1)
  })
  it('counts capacity omissions after validating all incoming conditions, not before', () => {
    const storage = new MemoryStorage()
    const searches = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => preset(id))
    const result = importData(JSON.stringify({ version: 1, savedSearches: searches }), storage)
    expect(result.savedSearchesSkipped).toBe(1)
    expect(JSON.parse(storage.getItem('scp-saved-searches-v1')).map(item => item.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

})
