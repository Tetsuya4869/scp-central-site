import { useState, useMemo, useEffect } from 'react'
import { BRANCHES, BRANCH_MAP } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import TITLES from '../data/titles.json'

const MAX_RESULTS = 100

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

  // 1. Custom series articles (依談 etc.)
  for (const branch of BRANCHES) {
    for (const series of branch.series) {
      if (series.type !== 'custom') continue
      for (const article of series.articles) {
        if (article.designation.toLowerCase().includes(qLower)) {
          add({ ...article, predicted: false }, branch, series, '')
          if (results.length >= MAX_RESULTS) return results
        }
      }
    }
  }

  // 2. Title search through titles.json
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

  // 3. SCP number search (e.g. "002", "SCP-002")
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

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const results = useMemo(() => doSearch(debounced), [debounced])

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
            className="search-input"
            type="search"
            placeholder="SCP番号・タイトルで検索（2文字以上）"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="search-results">
        {debounced.length < 2 && (
          <p className="search-hint">支部・シリーズを横断して検索します</p>
        )}
        {debounced.length >= 2 && results.length === 0 && (
          <p className="search-hint">「{debounced}」に一致する記事はありません</p>
        )}
        {results.map(({ article, branch, series, title }) => (
          <div
            key={article.id}
            className={`search-result${isChecked(article.id) ? ' is-read' : ''}`}
            onClick={() => onNavigate({ branchCode: branch.code, view: 'series', seriesId: series.id })}
          >
            <span className="search-branch-badge" style={{ background: branch.accent }}>
              {branch.code}
            </span>
            <div className="search-article-info">
              <span className="search-designation">{article.designation}</span>
              {title && <span className="search-title">{title}</span>}
            </div>
            <div className="search-meta">
              {isChecked(article.id) && <span className="badge badge-read">読了</span>}
              {isFavorite(article.id) && <span className="search-fav-mark">★</span>}
            </div>
          </div>
        ))}
        {results.length >= MAX_RESULTS && (
          <p className="search-hint">上位{MAX_RESULTS}件を表示中。検索語を追加して絞り込んでください。</p>
        )}
      </div>
    </>
  )
}
