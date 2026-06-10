import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { BRANCHES, BRANCH_MAP } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import TITLES from '../data/titles.json'
import CHAR_COUNTS from '../data/char_counts.json'
import RATINGS from '../data/ratings.json'

const MAX_RESULTS = 300
const JP_BASE = 'http://scp-jp.wikidot.com/'

function getSlug(url) {
  return url.startsWith(JP_BASE) ? url.slice(JP_BASE.length) : null
}

function fmtChars(n) {
  if (n == null) return null
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万字` : `${n.toLocaleString()}字`
}

function doSearch(query) {
  const q = query.trim()
  if (q.length < 2) return []
  const qLower = q.toLowerCase()
  const results = []
  const seen = new Set()

  function add(article, branch, series, title) {
    if (seen.has(article.id)) return
    seen.add(article.id)
    results.push({ article, branch, series, title: title ?? TITLES[branch.code]?.[String(article.number)] ?? '' })
  }

  // 1. Custom series articles
  for (const branch of BRANCHES) {
    for (const series of branch.series) {
      if (series.type !== 'custom') continue
      for (const article of series.articles) {
        const titleStr = article.title ?? ''
        if (article.designation.toLowerCase().includes(qLower) || titleStr.toLowerCase().includes(qLower)) {
          add({ ...article, predicted: false }, branch, series, titleStr)
          if (results.length >= MAX_RESULTS) return results
        }
      }
    }
  }

  // 2. Title search
  for (const [branchCode, titleMap] of Object.entries(TITLES)) {
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
        if (results.length >= MAX_RESULTS) return results
      }
    }
  }

  // 3. SCP number search
  const numMatch = q.match(/(\d+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    for (const branch of BRANCHES) {
      for (const series of branch.series) {
        if (series.type === 'custom') continue
        const min = branch.minNumber ? Math.max(series.min, branch.minNumber) : series.min
        if (num >= min && num <= series.max) {
          const [article] = generateSeriesArticles(branch.code, num, num)
          if (article) add(article, branch, series)
        }
      }
      if (results.length >= MAX_RESULTS) return results
    }
  }

  return results
}

export default function SearchPage({ onNavigate, onOpenSidebar, isChecked, isFavorite }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [branchFilter, setBranchFilter] = useState(null)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const resultsRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset highlight when results change
  useEffect(() => { setHighlightIdx(-1) }, [debounced, branchFilter])

  const allResults = useMemo(() => doSearch(debounced), [debounced])

  const results = useMemo(() => {
    if (!branchFilter) return allResults
    return allResults.filter(x => x.branch.code === branchFilter)
  }, [allResults, branchFilter])

  // Scroll highlighted row into view
  useEffect(() => {
    if (highlightIdx < 0 || !resultsRef.current) return
    const el = resultsRef.current.children[highlightIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx])

  const handleKeyDown = useCallback((e) => {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault()
      const r = results[highlightIdx]
      if (r) onNavigate({ branchCode: r.branch.code, view: 'series', seriesId: r.series.id, targetId: r.article.id })
    }
  }, [results, highlightIdx, onNavigate])

  // Active branch codes that have results
  const activeBranches = useMemo(() => {
    const codes = new Set(allResults.map(r => r.branch.code))
    return BRANCHES.filter(b => codes.has(b.code))
  }, [allResults])

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニュー">≡</button>
          <span className="toolbar-title">検索</span>
          <div className="toolbar-spacer" />
          {debounced.length >= 2 && (
            <span className="progress-text" style={{ marginRight: 8 }}>
              {results.length >= MAX_RESULTS ? `${MAX_RESULTS}+` : results.length} 件
            </span>
          )}
        </div>
        <div className="toolbar-row toolbar-row-bottom">
          <input
            ref={inputRef}
            className="search-input"
            type="search"
            placeholder="SCP番号・タイトルで検索（2文字以上）"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        {activeBranches.length > 0 && (
          <div className="search-branch-filter">
            <button
              className={`branch-chip${branchFilter === null ? ' active' : ''}`}
              onClick={() => setBranchFilter(null)}
            >
              全支部
            </button>
            {activeBranches.map(b => (
              <button
                key={b.code}
                className={`branch-chip${branchFilter === b.code ? ' active' : ''}`}
                style={branchFilter === b.code ? { borderColor: b.accent, color: b.accent } : {}}
                onClick={() => setBranchFilter(f => f === b.code ? null : b.code)}
              >
                {b.code}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="search-results" ref={resultsRef}>
        {debounced.length < 2 && (
          <p className="search-hint">支部・シリーズを横断して検索します</p>
        )}
        {debounced.length >= 2 && results.length === 0 && (
          <p className="search-hint">「{debounced}」に一致する記事はありません</p>
        )}
        {results.map(({ article, branch, series, title }, idx) => {
          const slug = getSlug(article.url)
          const charCount = slug ? (CHAR_COUNTS[slug] ?? null) : null
          const rating    = slug ? (RATINGS[slug]    ?? null) : null
          return (
            <div
              key={article.id}
              className={[
                'search-result',
                isChecked(article.id) ? 'is-read' : '',
                idx === highlightIdx ? 'is-highlighted' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onNavigate({ branchCode: branch.code, view: 'series', seriesId: series.id, targetId: article.id })}
            >
              <span className="search-branch-badge" style={{ background: branch.accent }}>
                {branch.code}
              </span>
              <div className="search-article-info">
                <span className="search-designation">{article.designation}</span>
                {title && <span className="search-title">{title}</span>}
              </div>
              <div className="search-meta">
                {charCount != null && <span className="scp-charcount">{fmtChars(charCount)}</span>}
                {rating    != null && <span className="scp-rating">👍 {rating}</span>}
                {isChecked(article.id)  && <span className="badge badge-read">読了</span>}
                {isFavorite(article.id) && <span className="search-fav-mark">★</span>}
              </div>
            </div>
          )
        })}
        {results.length >= MAX_RESULTS && (
          <p className="search-hint">上位{MAX_RESULTS}件を表示中。検索語を追加して絞り込んでください。</p>
        )}
      </div>
    </>
  )
}
