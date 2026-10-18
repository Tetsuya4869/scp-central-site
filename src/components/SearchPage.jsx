import { useState, useMemo, useEffect } from 'react'
import { getTitles, getCharCounts, getRatings, useDataReady } from '../data/dataStore.js'
import { MAX_SEARCH_RESULTS as MAX_RESULTS, searchArticles } from '../utils/search.js'
import Icon from './Icon.jsx'

const JP_BASE = 'http://scp-jp.wikidot.com/'

function getSlug(url) {
  return url.startsWith(JP_BASE) ? url.slice(JP_BASE.length) : null
}

function fmtChars(n) {
  if (n == null) return null
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万字` : `${n.toLocaleString()}字`
}

export default function SearchPage({ onNavigate, onOpenSidebar, isChecked, isFavorite }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [branchFilter, setBranchFilter] = useState(null)
  const dataReady = useDataReady() // データ到着後に再検索させる

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { results, branches: activeBranches } = useMemo(
    () => searchArticles(debounced, getTitles(), branchFilter),
    [debounced, branchFilter, dataReady],
  )

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニューを開く">
            <Icon name="menu" />
          </button>
          <h1 className="toolbar-title" data-view-heading tabIndex={-1}>検索</h1>
          <div className="toolbar-spacer" />
          {debounced.length >= 2 && (
            <span className="progress-text toolbar-count" aria-live="polite" aria-atomic="true">
              {results.length >= MAX_RESULTS ? `${MAX_RESULTS}+` : results.length} 件
            </span>
          )}
        </div>
        <div className="toolbar-row toolbar-row-bottom">
          <input
            className="search-input"
            type="search"
            placeholder="SCP番号・タイトルで検索（2文字以上）"
            aria-label="SCP番号またはタイトルで検索"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            data-route-autofocus
          />
        </div>
        {activeBranches.length > 0 && (
          <div className="search-branch-filter">
            <button
              className={`branch-chip${branchFilter === null ? ' active' : ''}`}
              onClick={() => setBranchFilter(null)}
              aria-pressed={branchFilter === null}
            >
              全支部
            </button>
            {activeBranches.map(b => (
              <button
                key={b.code}
                className={`branch-chip${branchFilter === b.code ? ' active' : ''}`}
                onClick={() => setBranchFilter(f => f === b.code ? null : b.code)}
                aria-pressed={branchFilter === b.code}
              >
                {b.code}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="search-results">
        {debounced.length < 2 && (
          <p className="search-hint">支部・シリーズを横断して検索します</p>
        )}
        {debounced.length >= 2 && results.length === 0 && (
          <p className="search-hint" role="status">「{debounced}」に一致する記事はありません</p>
        )}
        {results.map(({ article, branch, series, title }) => {
          const slug = getSlug(article.url)
          const charCount = slug ? (getCharCounts()[slug] ?? null) : null
          const rating    = slug ? (getRatings()[slug]    ?? null) : null
          return (
            <button
              type="button"
              key={article.id}
              className={[
                'search-result',
                isChecked(article.id) ? 'is-read' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onNavigate({ branchCode: branch.code, view: 'series', seriesId: series.id, targetId: article.id })}
            >
              <span className="search-branch-badge">
                {branch.code}
              </span>
              <span className="search-article-info">
                <span className="search-designation">{article.designation}</span>
                {title && <span className="search-title">{title}</span>}
              </span>
              <span className="search-meta">
                {charCount != null && <span className="scp-charcount">{fmtChars(charCount)}</span>}
                {rating    != null && <span className="scp-rating">評価 {rating}</span>}
                {isChecked(article.id)  && <span className="badge badge-read">読了</span>}
                {isFavorite(article.id) && (
                  <span className="search-fav-mark" aria-label="お気に入り">
                    <Icon name="star" size={14} />
                  </span>
                )}
              </span>
            </button>
          )
        })}
        {results.length >= MAX_RESULTS && (
          <p className="search-hint">上位{MAX_RESULTS}件を表示中。検索語を追加して絞り込んでください。</p>
        )}
      </div>
    </>
  )
}
