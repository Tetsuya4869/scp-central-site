import { useState, useMemo, useEffect } from 'react'
import { BRANCHES, BRANCH_MAP } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import { getTitles, getCharCounts, getRatings, useDataReady } from '../data/dataStore.js'
import Icon from './Icon.jsx'

const MAX_RESULTS = 300
const JP_BASE = 'http://scp-jp.wikidot.com/'

function getSlug(url) {
  return url.startsWith(JP_BASE) ? url.slice(JP_BASE.length) : null
}

function fmtChars(n) {
  if (n == null) return null
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万字` : `${n.toLocaleString()}字`
}

function doSearch(query, branchFilter = null, maxResults = MAX_RESULTS) {
  const q = query.trim()
  if (q.length < 2) return []
  const qLower = q.toLowerCase()
  const results = []
  const seen = new Set()
  const branches = branchFilter
    ? BRANCHES.filter(branch => branch.code === branchFilter)
    : BRANCHES

  function add(article, branch, series, title) {
    if (article.predicted || seen.has(article.id)) return
    seen.add(article.id)
    results.push({ article, branch, series, title: title ?? getTitles()[branch.code]?.[String(article.number)] ?? '' })
  }

  // 1. Custom series articles
  for (const branch of branches) {
    for (const series of branch.series) {
      if (series.type !== 'custom') continue
      for (const article of series.articles) {
        const titleStr = article.title ?? ''
        if (article.designation.toLowerCase().includes(qLower) || titleStr.toLowerCase().includes(qLower)) {
          add({ ...article, predicted: Boolean(article.predicted) }, branch, series, titleStr)
          if (results.length >= maxResults) return results
        }
      }
    }
  }

  // 2. Title search
  for (const [branchCode, titleMap] of Object.entries(getTitles())) {
    if (branchFilter && branchCode !== branchFilter) continue
    const branch = BRANCH_MAP[branchCode]
    if (!branch) continue
    for (const [numStr, title] of Object.entries(titleMap)) {
      if (!title.toLowerCase().includes(qLower)) continue
      const num = parseInt(numStr, 10)
      if (isNaN(num)) continue
      const series = branch.series.find(s => {
        if (s.type === 'custom') return false
        const min = branch.minNumber ? Math.max(s.min, branch.minNumber) : s.min
        return num >= min && num <= s.max
      })
      if (!series) continue
      const [article] = generateSeriesArticles(branchCode, num, num)
      if (article) {
        add(article, branch, series, title)
        if (results.length >= maxResults) return results
      }
    }
  }

  // 3. SCP number search
  const numMatch = q.match(/(\d+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    for (const branch of branches) {
      for (const series of branch.series) {
        if (series.type === 'custom') continue
        const min = branch.minNumber ? Math.max(series.min, branch.minNumber) : series.min
        if (num >= min && num <= series.max) {
          const [article] = generateSeriesArticles(branch.code, num, num)
          if (article) add(article, branch, series)
        }
      }
      if (results.length >= maxResults) return results
    }
  }

  return results
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

  const allResults = useMemo(() => doSearch(debounced), [debounced, dataReady])

  // Re-run a scoped search before applying the result cap. Filtering an
  // already-capped global list can otherwise hide valid later matches.
  const results = useMemo(
    () => branchFilter ? doSearch(debounced, branchFilter) : allResults,
    [allResults, branchFilter, debounced, dataReady],
  )

  // Active branch codes that have results
  const activeBranches = useMemo(() => {
    if (debounced.trim().length < 2) return []
    // Probe each branch with a one-result cap so branches that occur after the
    // global 300-result window still remain selectable.
    return BRANCHES.filter(branch => doSearch(debounced, branch.code, 1).length > 0)
  }, [debounced, dataReady])

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
