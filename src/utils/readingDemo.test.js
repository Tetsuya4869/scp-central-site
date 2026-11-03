import { describe, expect, it } from 'vitest'
import {
  DEMO_ARTICLES, createDemoState, demoReducer, selectDemoArticles,
  getDemoProgress, getResumeArticle,
} from './readingDemo.js'

const reduce = (state, ...actions) => actions.reduce(demoReducer, state)
const ids = articles => articles.map(article => article.id)

describe('isolated reading interaction demo', () => {
  it('uses twelve fictional immutable records, with separate demo IDs and no external links', () => {
    expect(DEMO_ARTICLES).toHaveLength(12)
    expect(new Set(ids(DEMO_ARTICLES)).size).toBe(12)
    expect(DEMO_ARTICLES.every(article => article.id.startsWith('demo-') && !article.url)).toBe(true)
    expect(Object.isFrozen(DEMO_ARTICLES)).toBe(true)
    for (const branchCode of ['JP', 'EN']) {
      for (const band of ['001〜999', '1000〜1999']) {
        expect(DEMO_ARTICLES.filter(article => article.branchCode === branchCode && article.band === band)).toHaveLength(3)
      }
    }
  })

  it('seeds independent read and favorite flags and keeps immutable prior states', () => {
    const initial = createDemoState()
    const read = demoReducer(initial, { type: 'TOGGLE_READ', id: 'demo-jp-003' })
    expect(read.readIds).toContain('demo-jp-003')
    expect(read.favoriteIds).toEqual(initial.favoriteIds)
    expect(initial.readIds).toHaveLength(3)
    const favorite = demoReducer(read, { type: 'TOGGLE_FAVORITE', id: 'demo-jp-003' })
    expect(favorite.favoriteIds).toContain('demo-jp-003')
    expect(favorite.readIds).toEqual(read.readIds)
    expect(read.favoriteIds).not.toContain('demo-jp-003')
    expect(demoReducer(initial, { type: 'TOGGLE_READ', id: 'JP-173' })).toBe(initial)
  })

  it('undoes only the last changed flag, preserving view, filters and earlier flags', () => {
    const state = reduce(createDemoState(),
      { type: 'TOGGLE_READ', id: 'demo-jp-003' },
      { type: 'TOGGLE_FAVORITE', id: 'demo-jp-003' },
      { type: 'SELECT_VIEW', view: 'search' },
      { type: 'SET_FILTER', field: 'query', value: 'しおり' },
      { type: 'SET_FILTER', field: 'sortBy', value: 'short' },
    )
    expect(state.lastChange).toEqual({ type: 'favorite', id: 'demo-jp-003', previousValue: false, nextValue: true })
    const undone = demoReducer(state, { type: 'UNDO' })
    expect(undone.favoriteIds).not.toContain('demo-jp-003')
    expect(undone.readIds).toContain('demo-jp-003')
    expect(undone).toMatchObject({ view: 'search', query: 'しおり', sortBy: 'short', lastChange: null })
    expect(demoReducer(undone, { type: 'UNDO' })).toBe(undone)
    const restoreRemoved = reduce(createDemoState(), { type: 'TOGGLE_READ', id: 'demo-jp-001' }, { type: 'UNDO' })
    expect(restoreRemoved.readIds).toContain('demo-jp-001')
  })

  it('resumes the current unread article or next unread in its band, then finds a fallback', () => {
    const initial = createDemoState()
    expect(getResumeArticle(initial).id).toBe('demo-jp-003')
    const opened = demoReducer(initial, { type: 'OPEN_ARTICLE', id: 'demo-en-1001' })
    expect(getResumeArticle(opened).id).toBe('demo-en-1001')
    expect(opened.readIds).toEqual(initial.readIds)
    const completedCurrent = demoReducer(opened, { type: 'TOGGLE_READ', id: 'demo-en-1001' })
    expect(getResumeArticle(completedCurrent).id).toBe('demo-en-1002')
    const wrap = { ...initial, lastOpenedId: 'demo-en-003', readIds: [...initial.readIds, 'demo-en-003'] }
    expect(getResumeArticle(wrap).id).toBe('demo-en-002')
    const completedBand = demoReducer(initial, { type: 'TOGGLE_READ', id: 'demo-jp-003' })
    expect(getResumeArticle(completedBand).id).toBe('demo-jp-1000')
    const complete = { ...initial, readIds: ids(DEMO_ARTICLES) }
    expect(getResumeArticle(complete)).toBeNull()
    expect(demoReducer(complete, { type: 'RESUME' })).toBe(complete)
  })

  it('restores the resumed branch and band and clears filters that could hide its highlight', () => {
    const state = reduce(createDemoState(),
      { type: 'OPEN_ARTICLE', id: 'demo-en-1001' },
      { type: 'SELECT_VIEW', view: 'favorites' },
      { type: 'SET_FILTER', field: 'query', value: 'no match' },
      { type: 'SET_FILTER', field: 'readFilter', value: 'read' },
      { type: 'SET_FILTER', field: 'favoritesOnly', value: true },
      { type: 'SET_FILTER', field: 'sortBy', value: 'rating' },
    )
    const resumed = demoReducer(state, { type: 'RESUME' })
    expect(resumed).toMatchObject({ view: 'list', branchCode: 'EN', band: '1000〜1999', query: '', readFilter: 'all', sortBy: 'number', favoritesOnly: false, highlightedId: 'demo-en-1001' })
    expect(ids(selectDemoArticles(resumed))).toContain(resumed.highlightedId)
  })

  it('keeps full progress and group denominators stable under every screen filter', () => {
    const initial = createDemoState()
    const progress = getDemoProgress(initial)
    expect(progress).toMatchObject({ done: 3, total: 12, percent: 25 })
    expect(progress.branches.find(branch => branch.branchCode === 'JP')).toMatchObject({ done: 2, total: 6 })
    expect(progress.bands.find(band => band.band === '001〜999')).toMatchObject({ done: 3, total: 6 })
    const filtered = reduce(initial,
      { type: 'SELECT_VIEW', view: 'search' },
      { type: 'SET_FILTER', field: 'branchCode', value: 'EN' },
      { type: 'SET_FILTER', field: 'query', value: 'no matches' },
      { type: 'SET_FILTER', field: 'favoritesOnly', value: true },
      { type: 'SET_FILTER', field: 'readFilter', value: 'unread' },
    )
    expect(selectDemoArticles(filtered)).toEqual([])
    expect(getDemoProgress(filtered)).toEqual(progress)
    expect(getDemoProgress(demoReducer(filtered, { type: 'TOGGLE_READ', id: 'demo-jp-003' }))).toMatchObject({ done: 4, total: 12 })
  })

  it('applies short unread search globally and favorites across branches', () => {
    const state = demoReducer(createDemoState(), { type: 'APPLY_SHORT_UNREAD' })
    const articles = selectDemoArticles(state)
    expect(state).toMatchObject({ view: 'search', branchCode: '', band: '', readFilter: 'unread', sortBy: 'short' })
    expect(articles).toHaveLength(9)
    expect(ids(articles.slice(0, 2))).toEqual(['demo-en-003', 'demo-jp-003'])
    expect(articles.map(article => article.charCount)).toEqual(articles.map(article => article.charCount).sort((a, b) => a - b))
    const favorites = demoReducer(createDemoState(), { type: 'SELECT_VIEW', view: 'favorites' })
    expect(ids(selectDemoArticles(favorites))).toEqual(['demo-jp-002', 'demo-en-1001'])
    expect(ids(selectDemoArticles(createDemoState()))).toEqual(['demo-jp-001', 'demo-jp-002', 'demo-jp-003'])
  })

  it('saves and restores a search snapshot without reverting flags or later reads', () => {
    const searched = reduce(createDemoState(),
      { type: 'APPLY_SHORT_UNREAD' },
      { type: 'SET_FILTER', field: 'branchCode', value: 'EN' },
      { type: 'SET_FILTER', field: 'query', value: '星' },
      { type: 'SAVE_SEARCH' },
    )
    const modified = reduce(searched,
      { type: 'SET_FILTER', field: 'query', value: 'changed' },
      { type: 'SET_FILTER', field: 'readFilter', value: 'all' },
      { type: 'SELECT_VIEW', view: 'list' },
      { type: 'TOGGLE_READ', id: 'demo-en-003' },
    )
    const restored = demoReducer(modified, { type: 'APPLY_SAVED_SEARCH' })
    expect(restored).toMatchObject({ view: 'search', branchCode: 'EN', band: '', query: '星', readFilter: 'unread', sortBy: 'short' })
    expect(restored.readIds).toContain('demo-en-003')
    expect(restored.savedSearch).toEqual(searched.savedSearch)
    expect(ids(selectDemoArticles(restored))).toEqual(['demo-en-1002'])
    expect(demoReducer(createDemoState(), { type: 'APPLY_SAVED_SEARCH' })).toEqual(createDemoState())
  })

  it('combines normalized number/title queries with sorting and favorite/read filters', () => {
    const state = { ...createDemoState(), view: 'search', branchCode: '', band: '', query: '　ＳＣＰ－１００１　昼休み　', readFilter: 'unread', favoritesOnly: true, sortBy: 'rating' }
    expect(ids(selectDemoArticles(state))).toEqual(['demo-en-1001'])
    const sorted = selectDemoArticles({ ...state, query: '', readFilter: 'all', favoritesOnly: false })
    expect(sorted[0].id).toBe('demo-en-1000')
    expect(sorted.at(-1).id).toBe('demo-en-003')
  })

  it('resets fresh state without mutating fixtures, seed arrays or prior snapshots', () => {
    const initial = createDemoState()
    const changed = reduce(initial,
      { type: 'TOGGLE_READ', id: 'demo-jp-003' },
      { type: 'SAVE_SEARCH' },
      { type: 'OPEN_ARTICLE', id: 'demo-en-1000' },
    )
    const reset = demoReducer(changed, { type: 'RESET' })
    expect(reset).toEqual(createDemoState())
    expect(reset.readIds).not.toBe(initial.readIds)
    expect(reset.favoriteIds).not.toBe(initial.favoriteIds)
    expect(changed.readIds).toContain('demo-jp-003')
    expect(initial.readIds).not.toContain('demo-jp-003')
    expect(ids(DEMO_ARTICLES)).toHaveLength(12)
    expect(demoReducer(initial, { type: 'SET_FILTER', field: 'readIds', value: [] })).toBe(initial)
    expect(demoReducer(initial, { type: 'SET_FILTER', field: 'branchCode', value: 'INVALID' })).toBe(initial)
  })
})
