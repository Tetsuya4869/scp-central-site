// Fictional fixtures for the interaction prototype. This module deliberately
// has no catalogue, browser-storage, network or application-hook dependencies.
export const DEMO_ARTICLES = Object.freeze([
  { id: 'demo-jp-001', number: 1, designation: 'SCP-001-JP', title: '雨をためる鍵', branchCode: 'JP', band: '001〜999', charCount: 1200, rating: 42, jpStatus: 'available' },
  { id: 'demo-jp-002', number: 2, designation: 'SCP-002-JP', title: '誰もいない待合室', branchCode: 'JP', band: '001〜999', charCount: 4800, rating: 85, jpStatus: 'available' },
  { id: 'demo-jp-003', number: 3, designation: 'SCP-003-JP', title: '逆向きのしおり', branchCode: 'JP', band: '001〜999', charCount: 850, rating: 63, jpStatus: 'unverified' },
  { id: 'demo-jp-1000', number: 1000, designation: 'SCP-1000-JP', title: '明日だけの図書館', branchCode: 'JP', band: '1000〜1999', charCount: 16000, rating: 120, jpStatus: 'available' },
  { id: 'demo-jp-1001', number: 1001, designation: 'SCP-1001-JP', title: '三分間の夜明け', branchCode: 'JP', band: '1000〜1999', charCount: 1600, rating: 36, jpStatus: 'unverified' },
  { id: 'demo-jp-1002', number: 1002, designation: 'SCP-1002-JP', title: '名前のない切符', branchCode: 'JP', band: '1000〜1999', charCount: 6200, rating: 72, jpStatus: 'available' },
  { id: 'demo-en-001', number: 1, designation: 'SCP-001', title: 'ガラスの郵便受け', branchCode: 'EN', band: '001〜999', charCount: 2400, rating: 55, jpStatus: 'available' },
  { id: 'demo-en-002', number: 2, designation: 'SCP-002', title: '廊下の向こうの海', branchCode: 'EN', band: '001〜999', charCount: 9500, rating: 98, jpStatus: 'unverified' },
  { id: 'demo-en-003', number: 3, designation: 'SCP-003', title: '紙でできた北極', branchCode: 'EN', band: '001〜999', charCount: 700, rating: 27, jpStatus: 'available' },
  { id: 'demo-en-1000', number: 1000, designation: 'SCP-1000', title: '閉じないエレベーター', branchCode: 'EN', band: '1000〜1999', charCount: 18000, rating: 145, jpStatus: 'unverified' },
  { id: 'demo-en-1001', number: 1001, designation: 'SCP-1001', title: '時計仕掛けの昼休み', branchCode: 'EN', band: '1000〜1999', charCount: 3200, rating: 81, jpStatus: 'available' },
  { id: 'demo-en-1002', number: 1002, designation: 'SCP-1002', title: '一度だけ鳴る星', branchCode: 'EN', band: '1000〜1999', charCount: 5400, rating: 64, jpStatus: 'unverified' },
].map(article => Object.freeze(article)))

const ARTICLE_IDS = new Set(DEMO_ARTICLES.map(article => article.id))
const BRANCHES = ['JP', 'EN']
const BANDS = ['001〜999', '1000〜1999']
const FILTER_KEYS = ['branchCode', 'band', 'query', 'readFilter', 'sortBy', 'favoritesOnly']
const FILTER_VALUES = {
  branchCode: ['', ...BRANCHES],
  band: ['', ...BANDS],
  readFilter: ['all', 'read', 'unread'],
  sortBy: ['number', 'rating', 'short'],
}

export function createDemoState() {
  return {
    readIds: ['demo-jp-001', 'demo-jp-002', 'demo-en-001'],
    favoriteIds: ['demo-jp-002', 'demo-en-1001'],
    view: 'list',
    branchCode: 'JP',
    band: BANDS[0],
    query: '',
    readFilter: 'all',
    sortBy: 'number',
    favoritesOnly: false,
    savedSearch: null,
    lastOpenedId: 'demo-jp-002',
    highlightedId: null,
    lastChange: null,
  }
}

function setFlag(ids, id, value) {
  return value ? [...ids.filter(item => item !== id), id] : ids.filter(item => item !== id)
}

function snapshotFilters(state) {
  return Object.fromEntries(FILTER_KEYS.map(key => [key, state[key]]))
}

/** A single undo journal records only the last flag, never view/filter state. */
export function demoReducer(state, action) {
  switch (action.type) {
    case 'SELECT_VIEW':
      return ['list', 'favorites', 'progress', 'search'].includes(action.view)
        ? { ...state, view: action.view, highlightedId: null }
        : state
    case 'SET_FILTER': {
      const { field, value } = action
      if (!FILTER_KEYS.includes(field)) return state
      if (field === 'query' && typeof value !== 'string') return state
      if (field === 'favoritesOnly' && typeof value !== 'boolean') return state
      if (FILTER_VALUES[field] && !FILTER_VALUES[field].includes(value)) return state
      return { ...state, [field]: value, highlightedId: null }
    }
    case 'TOGGLE_READ':
    case 'TOGGLE_FAVORITE': {
      if (!ARTICLE_IDS.has(action.id)) return state
      const type = action.type === 'TOGGLE_READ' ? 'read' : 'favorite'
      const key = type === 'read' ? 'readIds' : 'favoriteIds'
      const previousValue = state[key].includes(action.id)
      return {
        ...state,
        [key]: setFlag(state[key], action.id, !previousValue),
        lastChange: { type, id: action.id, previousValue, nextValue: !previousValue },
      }
    }
    case 'UNDO': {
      if (!state.lastChange) return state
      const { type, id, previousValue } = state.lastChange
      const key = type === 'read' ? 'readIds' : 'favoriteIds'
      return { ...state, [key]: setFlag(state[key], id, previousValue), lastChange: null }
    }
    case 'OPEN_ARTICLE':
      return ARTICLE_IDS.has(action.id) ? { ...state, lastOpenedId: action.id } : state
    case 'RESUME': {
      const article = getResumeArticle(state)
      return article ? {
        ...state,
        view: 'list',
        branchCode: article.branchCode,
        band: article.band,
        query: '',
        readFilter: 'all',
        sortBy: 'number',
        favoritesOnly: false,
        lastOpenedId: article.id,
        highlightedId: article.id,
      } : state
    }
    case 'APPLY_SHORT_UNREAD':
      return { ...state, view: 'search', branchCode: '', band: '', query: '', readFilter: 'unread', sortBy: 'short', favoritesOnly: false, highlightedId: null }
    case 'SAVE_SEARCH':
      return { ...state, savedSearch: snapshotFilters(state) }
    case 'APPLY_SAVED_SEARCH':
      return state.savedSearch ? { ...state, ...state.savedSearch, view: 'search', highlightedId: null } : state
    case 'RESET':
      return createDemoState()
    default:
      return state
  }
}

const normalize = text => String(text).normalize('NFKC').toLowerCase().trim()
function numberOrder(a, b) {
  return a.number - b.number || a.branchCode.localeCompare(b.branchCode) || a.id.localeCompare(b.id)
}

/** The favorites tab spans branches even when the list has a branch selected. */
export function selectDemoArticles(state) {
  const read = new Set(state.readIds)
  const favorites = new Set(state.favoriteIds)
  const terms = normalize(state.query).split(/\s+/).filter(Boolean)
  const result = DEMO_ARTICLES.filter(article => {
    if (state.view === 'favorites') {
      if (!favorites.has(article.id)) return false
    } else {
      if (state.branchCode && state.branchCode !== article.branchCode) return false
      if (state.band && state.band !== article.band) return false
    }
    if (state.readFilter === 'read' && !read.has(article.id)) return false
    if (state.readFilter === 'unread' && read.has(article.id)) return false
    if (state.favoritesOnly && !favorites.has(article.id)) return false
    const haystack = normalize(`${article.number} ${article.designation} ${article.title}`)
    return terms.every(term => haystack.includes(term))
  })
  return result.sort((a, b) => {
    if (state.sortBy === 'rating') return b.rating - a.rating || numberOrder(a, b)
    if (state.sortBy === 'short') return a.charCount - b.charCount || numberOrder(a, b)
    return numberOrder(a, b)
  })
}

function progressFor(articles, read) {
  const total = articles.length
  const done = articles.filter(article => read.has(article.id)).length
  return { done, total, percent: total ? Math.round(done / total * 1000) / 10 : 0 }
}

/** Progress always describes all fixtures, independent of visible filters. */
export function getDemoProgress(state) {
  const read = new Set(state.readIds)
  return {
    ...progressFor(DEMO_ARTICLES, read),
    branches: BRANCHES.map(branchCode => {
      const articles = DEMO_ARTICLES.filter(article => article.branchCode === branchCode)
      return {
        branchCode,
        ...progressFor(articles, read),
        bands: BANDS.map(band => ({ band, ...progressFor(articles.filter(article => article.band === band), read) })),
      }
    }),
    bands: BANDS.map(band => ({ band, ...progressFor(DEMO_ARTICLES.filter(article => article.band === band), read) })),
  }
}

/** Keep an unread current article; otherwise continue within its numbered band. */
export function getResumeArticle(state) {
  const read = new Set(state.readIds)
  const current = DEMO_ARTICLES.find(article => article.id === state.lastOpenedId)
  if (current && !read.has(current.id)) return current
  if (current) {
    const group = DEMO_ARTICLES.filter(article => article.branchCode === current.branchCode && article.band === current.band)
      .sort(numberOrder)
    const next = group.find(article => article.number > current.number && !read.has(article.id))
      ?? group.find(article => !read.has(article.id))
    if (next) return next
  }
  return DEMO_ARTICLES.find(article => !read.has(article.id)) ?? null
}
