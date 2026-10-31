import { useEffect, useMemo, useRef, useState } from 'react'
import { BRANCHES } from '../data/branches.js'
import { getTitles, getCharCounts, getRatings, useDataReady } from '../data/dataStore.js'
import { buildExploreIndex, queryExploreIndex } from '../utils/exploreSearch.js'

const PAGE_SIZE = 100
const STORAGE_KEY = 'scp-explore-search-v1'
const SORT_OPTIONS = [
  ['number-asc', '番号の小さい順'],
  ['number-desc', '番号の大きい順'],
  ['title-asc', 'タイトル順'],
  ['rating-desc', '評価の高い順'],
  ['rating-asc', '評価の低い順'],
  ['chars-asc', '文字数の少ない順'],
  ['chars-desc', '文字数の多い順'],
]
const DEFAULT_STATE = {
  query: '', branchCode: '', seriesId: '', readFilter: 'all',
  favoritesOnly: false, sortBy: 'number-asc', page: 0,
}

function loadSearchState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (!saved || typeof saved !== 'object') return { ...DEFAULT_STATE }
    const branch = BRANCHES.find(item => item.code === saved.branchCode)
    const series = branch?.series.find(item => item.type !== 'separator' && String(item.id) === String(saved.seriesId))
    return {
      query: typeof saved.query === 'string' ? saved.query : '',
      branchCode: branch?.code ?? '',
      seriesId: series ? String(series.id) : '',
      readFilter: ['all', 'read', 'unread'].includes(saved.readFilter) ? saved.readFilter : 'all',
      favoritesOnly: saved.favoritesOnly === true,
      sortBy: SORT_OPTIONS.some(([key]) => key === saved.sortBy) ? saved.sortBy : 'number-asc',
      page: Number.isSafeInteger(saved.page) && saved.page >= 0 ? saved.page : 0,
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function seriesLabel(series) {
  return series.type === 'custom'
    ? series.label
    : `${String(series.min).padStart(3, '0')}〜${series.max}`
}

export default function SearchPage({ onNavigate, isChecked, isFavorite, toggle, toggleFavorite }) {
  const dataReady = useDataReady()
  const [state, setState] = useState(loadSearchState)
  const resultsHeadingRef = useRef(null)
  const selectedBranch = BRANCHES.find(branch => branch.code === state.branchCode)

  // Reading/favorite updates change only the filtered view, not the metadata index.
  const index = useMemo(() => buildExploreIndex({
    titles: getTitles(), charCounts: getCharCounts(), ratings: getRatings(),
  }), [dataReady])
  const results = useMemo(() => queryExploreIndex(index, {
    query: state.query,
    branchCode: state.branchCode,
    seriesId: state.seriesId,
    readFilter: state.readFilter,
    favoritesOnly: state.favoritesOnly,
    sortBy: state.sortBy,
    isChecked,
    isFavorite,
  }), [index, state.query, state.branchCode, state.seriesId, state.readFilter,
    state.favoritesOnly, state.sortBy, isChecked, isFavorite])

  // Sort the entire result set before taking the visible page.
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const currentPage = Math.min(state.page, pageCount - 1)
  const pageStart = currentPage * PAGE_SIZE
  const visibleResults = results.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  useEffect(() => {
    // A saved title query may have no matches until metadata arrives. Preserve
    // its page through that initial load, then clamp against the final results.
    if (dataReady && state.page !== currentPage) {
      setState(previous => ({ ...previous, page: currentPage }))
    }
  }, [dataReady, state.page, currentPage])

  function updateFilter(field, value) {
    setState(previous => ({ ...previous, [field]: value, ...(field === 'branchCode' ? { seriesId: '' } : {}), page: 0 }))
  }

  function goToPage(page) {
    setState(previous => ({ ...previous, page: Math.max(0, Math.min(page, pageCount - 1)) }))
    requestAnimationFrame(() => {
      resultsHeadingRef.current?.focus({ preventScroll: true })
      resultsHeadingRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
  }

  function toggleRow(record, favorite) {
    const shouldMoveFocus = favorite ? state.favoritesOnly : state.readFilter !== 'all'
    const position = visibleResults.findIndex(item => item.id === record.id)
    const neighborId = visibleResults[position + 1]?.id ?? visibleResults[position - 1]?.id
    if (favorite) toggleFavorite(record.id)
    else toggle(record.id)
    if (!shouldMoveFocus) return
    requestAnimationFrame(() => {
      const nextRow = neighborId ? document.getElementById(`explorer-${neighborId}`) : null
      const nextControl = nextRow?.querySelector(favorite ? '.checklist-favorite' : 'input[type="checkbox"]')
      if (nextControl) nextControl.focus({ preventScroll: true })
      else resultsHeadingRef.current?.focus({ preventScroll: true })
    })
  }

  function pagination(position) {
    return (
      <nav className="explorer-pagination" aria-label={`検索結果のページ切り替え（${position}）`}>
        <button type="button" disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>前の100件</button>
        <span>{currentPage + 1} / {pageCount.toLocaleString()} ページ</span>
        <button type="button" disabled={currentPage + 1 >= pageCount} onClick={() => goToPage(currentPage + 1)}>次の100件</button>
      </nav>
    )
  }

  return (
    <section className="tracker-page explorer-page">
      <div className="tracker-page-heading">
        <h1 data-view-heading tabIndex={-1}>総合検索</h1>
      </div>
      <p className="explorer-intro tracker-muted">全支部の記事を絞り込み、評価や文字数で並べ替えられます。</p>
      <p className="explorer-intro tracker-muted">評価・文字数はSCP-JPの取得データです。評価・文字数順では未取得の記事を末尾に表示します。</p>
      <form className="explorer-filters" onSubmit={event => event.preventDefault()}>
        <label className="explorer-field explorer-query">
          <span>番号・タイトル</span>
          <input type="search" data-route-autofocus value={state.query} onChange={event => updateFilter('query', event.target.value)} placeholder="例: SCP-173、173、タイトルの一部" />
        </label>
        <label className="explorer-field">
          <span>支部</span>
          <select value={state.branchCode} onChange={event => updateFilter('branchCode', event.target.value)}>
            <option value="">すべての支部</option>
            {BRANCHES.map(branch => <option value={branch.code} key={branch.code}>{branch.code} · {branch.nativeName}</option>)}
          </select>
        </label>
        <label className="explorer-field">
          <span>シリーズ</span>
          <select value={state.seriesId} disabled={!selectedBranch} onChange={event => updateFilter('seriesId', event.target.value)}>
            <option value="">{selectedBranch ? 'すべてのシリーズ' : '支部を選択してください'}</option>
            {selectedBranch?.series.filter(series => series.type !== 'separator').map(series => <option value={String(series.id)} key={series.id}>{seriesLabel(series)}</option>)}
          </select>
        </label>
        <label className="explorer-field">
          <span>読了状態</span>
          <select value={state.readFilter} onChange={event => updateFilter('readFilter', event.target.value)}>
            <option value="all">すべて</option><option value="unread">未読</option><option value="read">読了</option>
          </select>
        </label>
        <label className="explorer-field">
          <span>並び順</span>
          <select value={state.sortBy} onChange={event => updateFilter('sortBy', event.target.value)}>
            {SORT_OPTIONS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select>
        </label>
        <label className="explorer-favorite-filter">
          <input type="checkbox" checked={state.favoritesOnly} onChange={event => updateFilter('favoritesOnly', event.target.checked)} />お気に入りのみ
        </label>
      </form>

      {!dataReady && <p className="explorer-loading tracker-muted" role="status">タイトル・文字数・評価の取得待ちです。番号の検索と読了・お気に入りの操作は利用できます。</p>}
      <div className="explorer-results-heading" ref={resultsHeadingRef} tabIndex={-1}>
        <h2>検索結果</h2>
        <span aria-live="polite" aria-atomic="true">{results.length.toLocaleString()} 件{results.length > 0 && ` · ${pageStart + 1}〜${Math.min(pageStart + PAGE_SIZE, results.length)} 件を表示`}</span>
      </div>
      {pagination('上部')}
      {results.length === 0 ? (
        <p className="tracker-empty">{dataReady ? '条件に一致する記事はありません。検索語や絞り込みを変更してください。' : '記事データの取得後に、タイトルを含めた検索結果を表示します。'}</p>
      ) : (
        <ul className="explorer-list" aria-label="総合検索の記事一覧">
          {visibleResults.map(record => {
            const { article, branch, series, title, charCount, rating } = record
            const read = isChecked(record.id)
            const favorite = isFavorite(record.id)
            return (
              <li id={`explorer-${record.id}`} key={record.id} className={`explorer-row${read ? ' is-read' : ''}`}>
                <label className="checklist-read">
                  <input type="checkbox" checked={read} onChange={() => toggleRow(record, false)} aria-label={`${article.designation}の読了`} />
                  <span className="sr-only">{read ? '読了' : '未読'}</span>
                </label>
                <a className="explorer-article" href={article.url} target="_blank" rel="noopener noreferrer">
                  <strong>{article.designation}</strong>
                  {title && title !== article.designation && <span>{title}</span>}
                  <small>{branch.code} · {seriesLabel(series)} · 文字数 {charCount == null ? '未取得' : `${charCount.toLocaleString()}字`} · 評価 {rating == null ? '未取得' : rating.toLocaleString()}{read ? ' · 読了' : ''}</small>
                </a>
                <button type="button" className="checklist-favorite" aria-label={`${article.designation}をお気に入り${favorite ? 'から解除' : 'に登録'}`} title={favorite ? 'お気に入りから解除' : 'お気に入りに登録'} aria-pressed={favorite} onClick={() => toggleRow(record, true)}>{favorite ? '★' : '☆'}</button>
                <button type="button" className="explorer-locate" aria-label={`${article.designation}を一覧で確認`} onClick={() => onNavigate({ branchCode: branch.code, view: 'series', seriesId: series.id, targetId: record.id })}>一覧で確認</button>
              </li>
            )
          })}
        </ul>
      )}
      {pagination('下部')}
    </section>
  )
}
