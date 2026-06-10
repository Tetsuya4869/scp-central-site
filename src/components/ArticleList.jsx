import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import TITLES from '../data/titles.json'
import CHAR_COUNTS from '../data/char_counts.json'
import RATINGS from '../data/ratings.json'

const JP_BASE = 'http://scp-jp.wikidot.com/'
const CARD_COLS = 2
const MATRIX_COLS = 8

function getSlug(article) {
  return article.url.startsWith(JP_BASE) ? article.url.slice(JP_BASE.length) : null
}

function getCharCount(article) {
  const slug = getSlug(article)
  return slug ? (CHAR_COUNTS[slug] ?? null) : null
}

function getRating(article) {
  const slug = getSlug(article)
  return slug ? (RATINGS[slug] ?? null) : null
}

function formatChars(n) {
  if (n == null) return null
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万字` : `${n.toLocaleString()}字`
}

function formatDate(date) {
  if (!date) return null
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

export default function ArticleList({
  branch, series, isChecked, toggle, markAll, onOpenSidebar,
  isFavorite, toggleFavorite, getMemo, setMemo, getReadDate,
  layoutMode, setLayoutMode,
  isQueued, addToQueue,
  getUserRating, setUserRating, hasUserRating,
  targetId,
}) {
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('number')
  const [jumpValue, setJumpValue] = useState('')
  const [highlightedId, setHighlightedId] = useState(null)
  const parentRef = useRef(null)
  const highlightTimerRef = useRef(null)

  const allArticles = useMemo(
    () => series.type === 'custom'
      ? series.articles.map(a => ({ ...a, predicted: false }))
      : generateSeriesArticles(branch.code, series.min, series.max),
    [branch.code, series]
  )

  const allIds = useMemo(() => allArticles.map(a => a.id), [allArticles])

  const filtered = useMemo(() => {
    let list = allArticles
    if (filter === 'read')   list = list.filter(a => isChecked(a.id))
    if (filter === 'unread') list = list.filter(a => !isChecked(a.id))
    if (filter === 'rated')  list = list.filter(a => hasUserRating?.(a.id))

    const isCharsSort    = sortBy === 'chars-asc'    || sortBy === 'chars-desc'
    const isRatingSort   = sortBy === 'rating-asc'   || sortBy === 'rating-desc'
    const isMyRatingSort = sortBy === 'myrating-asc' || sortBy === 'myrating-desc'

    if (isCharsSort || isRatingSort || isMyRatingSort) {
      const dir = sortBy.endsWith('-asc') ? 1 : -1
      const getter = isCharsSort
        ? getCharCount
        : isRatingSort
          ? getRating
          : (a) => getUserRating?.(a.id) ?? null
      list = [...list].sort((a, b) => {
        const ca = getter(a)
        const cb = getter(b)
        if (ca == null && cb == null) return 0
        if (ca == null) return 1
        if (cb == null) return -1
        return dir * (ca - cb)
      })
    }
    return list
  }, [allArticles, filter, sortBy, isChecked, hasUserRating, getUserRating])

  const cols = layoutMode === 'card' ? CARD_COLS : layoutMode === 'matrix' ? MATRIX_COLS : 1
  const virtualRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < filtered.length; i += cols) {
      rows.push(filtered.slice(i, i + cols))
    }
    return rows
  }, [filtered, cols])

  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => layoutMode === 'card' ? 130 : layoutMode === 'matrix' ? 48 : 44,
    overscan: layoutMode === 'matrix' ? 4 : 10,
  })

  // Jump to targetId on mount (from search navigation)
  useEffect(() => {
    if (!targetId) return
    const idx = filtered.findIndex(a => a.id === targetId)
    if (idx === -1) return
    const rowIdx = Math.floor(idx / cols)
    const t = setTimeout(() => {
      rowVirtualizer.scrollToIndex(rowIdx, { align: 'center', behavior: 'smooth' })
      setHighlightedId(targetId)
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2000)
    }, 80)
    return () => {
      clearTimeout(t)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, []) // run once on mount; filtered/cols/rowVirtualizer are stable at mount time

  const readCount = useMemo(
    () => allArticles.filter(a => isChecked(a.id)).length,
    [allArticles, isChecked]
  )
  const pct = allArticles.length > 0
    ? Math.round((readCount / allArticles.length) * 100)
    : 0

  function changeLayout(newMode) {
    setLayoutMode(newMode)
    rowVirtualizer.scrollToOffset(0)
  }

  function handleFilter(f) {
    setFilter(f)
    rowVirtualizer.scrollToOffset(0)
  }

  function cycleCharsSort() {
    const next = sortBy === 'chars-asc' ? 'chars-desc' : sortBy === 'chars-desc' ? 'number' : 'chars-asc'
    setSortBy(next)
    rowVirtualizer.scrollToOffset(0)
  }

  function cycleRatingSort() {
    const next = sortBy === 'rating-asc' ? 'rating-desc' : sortBy === 'rating-desc' ? 'number' : 'rating-asc'
    setSortBy(next)
    rowVirtualizer.scrollToOffset(0)
  }

  function cycleMyRatingSort() {
    const next = sortBy === 'myrating-asc' ? 'myrating-desc' : sortBy === 'myrating-desc' ? 'number' : 'myrating-asc'
    setSortBy(next)
    rowVirtualizer.scrollToOffset(0)
  }

  function handleJump(e) {
    if (e.key !== 'Enter') return
    const val = jumpValue.trim().toLowerCase()
    if (!val) return

    const numOnly = val.replace(/[^0-9]/g, '')
    const numVal = numOnly ? parseInt(numOnly, 10) : NaN
    let idx = -1

    if (!isNaN(numVal)) {
      idx = filtered.findIndex(a => a.number === numVal)
      if (idx === -1) {
        const padded = String(numVal).padStart(3, '0')
        idx = filtered.findIndex(a => a.designation?.toLowerCase().includes(padded))
      }
    }
    if (idx === -1) {
      idx = filtered.findIndex(a =>
        a.designation?.toLowerCase().includes(val) ||
        (a.title ?? '').toLowerCase().includes(val)
      )
    }

    if (idx !== -1) {
      rowVirtualizer.scrollToIndex(Math.floor(idx / cols), { align: 'start', behavior: 'smooth' })
    }
    setJumpValue('')
  }

  const hubUrl = branch.domain + series.hub

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="支部選択">≡</button>
          <span className="toolbar-title">{series.label}</span>
          <span className="toolbar-sub"> · {branch.nativeName}</span>
          <a className="toolbar-hub-link" href={hubUrl} target="_blank" rel="noopener noreferrer">
            [ハブ↗]
          </a>
          <div className="toolbar-spacer" />
          <div className="series-progress">
            <div className="progress-bar-wrap">
              <div
                className="progress-bar-fill"
                style={{ width: `${pct}%`, background: branch.accent }}
              />
            </div>
            <span className="progress-text">{readCount}</span>
            <span className="progress-denom">/{allArticles.length} ({pct}%)</span>
          </div>
        </div>

        {/* Layout selector */}
        <div className="toolbar-row toolbar-row-layout">
          {[
            { key: 'list',   label: 'リスト',   sub: '行一覧' },
            { key: 'card',   label: 'カード',   sub: '詳細表示' },
            { key: 'matrix', label: 'グリッド', sub: '全体把握' },
          ].map(({ key, label, sub }) => (
            <button
              key={key}
              className={`layout-tab${layoutMode === key ? ' active' : ''}`}
              onClick={() => changeLayout(key)}
            >
              <span className="layout-tab-label">{label}</span>
              <span className="layout-tab-sub">{sub}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-row toolbar-row-bottom">
          <div className="filter-tabs">
            {[
              { key: 'all',    label: '全て' },
              { key: 'read',   label: '読了' },
              { key: 'unread', label: '未読' },
              { key: 'rated',  label: '評価済' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-tab${filter === key ? ' active' : ''}`}
                onClick={() => handleFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {layoutMode !== 'matrix' && (
            <>
              <button
                className={`mark-btn${sortBy.startsWith('chars') ? ' active' : ''}`}
                onClick={cycleCharsSort}
                title="文字数順"
              >
                {sortBy === 'chars-asc' ? '文字数 ▲' : sortBy === 'chars-desc' ? '文字数 ▼' : '文字数順'}
              </button>
              <button
                className={`mark-btn${sortBy.startsWith('rating') ? ' active' : ''}`}
                onClick={cycleRatingSort}
                title="評価順"
              >
                {sortBy === 'rating-asc' ? '評価 ▲' : sortBy === 'rating-desc' ? '評価 ▼' : '評価順'}
              </button>
              <button
                className={`mark-btn${sortBy.startsWith('myrating') ? ' active' : ''}`}
                onClick={cycleMyRatingSort}
                title="マイ評価順"
              >
                {sortBy === 'myrating-asc' ? 'マイ評価 ▲' : sortBy === 'myrating-desc' ? 'マイ評価 ▼' : 'マイ評価順'}
              </button>
            </>
          )}

          <div className="mark-btns">
            <button className="mark-btn" onClick={() => markAll(allIds, true)}>全選択</button>
            <button className="mark-btn" onClick={() => markAll(allIds, false)}>全解除</button>
          </div>

          {layoutMode !== 'matrix' && (
            <input
              className="jump-input"
              type="text"
              inputMode="search"
              placeholder="番号/名前で移動…"
              value={jumpValue}
              onChange={e => setJumpValue(e.target.value)}
              onKeyDown={handleJump}
            />
          )}
        </div>
      </div>

      {layoutMode === 'list' && (
        <div className="article-header-row">
          <div className="article-th col-check">✓</div>
          <div className="article-th col-num">No.</div>
          <div className="article-th col-badges">状態</div>
          <div className="article-th col-fav">★</div>
          <div className="article-th col-queue">+</div>
          <div className="article-th col-memo">✎</div>
          <div className="article-th col-myrating">マイ評価</div>
        </div>
      )}

      <div ref={parentRef} className="article-list-wrap">
        {virtualRows.length === 0 ? (
          <div className="list-empty">
            {filter === 'read' ? '読了記事なし' : filter === 'rated' ? '評価済み記事なし' : '未読記事なし'}
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(virtualItem => {
              const rowArticles = virtualRows[virtualItem.index]
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {layoutMode === 'list' ? (
                    <ArticleRow
                      article={rowArticles[0]}
                      read={isChecked(rowArticles[0].id)}
                      onToggle={() => toggle(rowArticles[0].id)}
                      favorited={isFavorite(rowArticles[0].id)}
                      onFavorite={() => toggleFavorite(rowArticles[0].id)}
                      memo={getMemo(rowArticles[0].id)}
                      onMemoChange={setMemo}
                      readDate={getReadDate(rowArticles[0].id)}
                      charCount={getCharCount(rowArticles[0])}
                      rating={getRating(rowArticles[0])}
                      queued={isQueued?.(rowArticles[0].id)}
                      onQueue={() => addToQueue?.(rowArticles[0].id)}
                      userRating={getUserRating?.(rowArticles[0].id)}
                      onUserRating={(id, val) => setUserRating?.(id, val)}
                      highlighted={highlightedId === rowArticles[0].id}
                    />
                  ) : layoutMode === 'card' ? (
                    <div className="card-row">
                      {rowArticles.map(article => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          read={isChecked(article.id)}
                          onToggle={() => toggle(article.id)}
                          favorited={isFavorite(article.id)}
                          onFavorite={() => toggleFavorite(article.id)}
                          memo={getMemo(article.id)}
                          onMemoChange={setMemo}
                          readDate={getReadDate(article.id)}
                          charCount={getCharCount(article)}
                          rating={getRating(article)}
                          queued={isQueued?.(article.id)}
                          onQueue={() => addToQueue?.(article.id)}
                          highlighted={highlightedId === article.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="matrix-row">
                      {rowArticles.map(article => (
                        <MatrixCell
                          key={article.id}
                          article={article}
                          read={isChecked(article.id)}
                          onToggle={() => toggle(article.id)}
                          highlighted={highlightedId === article.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="list-footer">
        <span className="list-count">全 <strong>{filtered.length}</strong> 件</span>
      </div>
    </>
  )
}

function UserRatingStars({ id, rating, onSet }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="user-rating-stars" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          className={`ur-star${(hovered || rating || 0) >= n ? ' filled' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onSet(id, rating === n ? null : n)}
          title={`${n}★`}
        >★</span>
      ))}
    </div>
  )
}

function ArticleRow({ article, read, onToggle, favorited, onFavorite, memo, onMemoChange, readDate, charCount, rating, queued, onQueue, userRating, onUserRating, highlighted }) {
  const [memoOpen, setMemoOpen] = useState(false)

  const rowClass = [
    'article-row',
    read ? 'is-read' : '',
    article.predicted ? 'is-predicted' : '',
    highlighted ? 'is-target-highlight' : '',
  ].filter(Boolean).join(' ')

  const title = article.title ?? TITLES[article.branchCode]?.[String(article.number)] ?? ''
  const hasMemo = memo.length > 0

  return (
    <>
      <div className={rowClass}>
        <div className="article-td col-check">
          <input
            type="checkbox"
            className="scp-checkbox"
            checked={read}
            onChange={onToggle}
          />
        </div>
        <div className="article-td col-num">
          <a
            className="scp-num-cell"
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="scp-designation">{article.designation}</span>
            {title && <span className="scp-title">{title}</span>}
            {charCount != null && <span className="scp-charcount">{formatChars(charCount)}</span>}
            {rating != null && <span className="scp-rating">👍 {rating}</span>}
          </a>
        </div>
        <div className="article-td col-badges">
          {article.predicted
            ? <span className="badge badge-predicted">予測</span>
            : read
              ? <span className="badge badge-read">読了</span>
              : null
          }
        </div>
        <div className="article-td col-fav">
          <button
            className={`fav-btn${favorited ? ' is-fav' : ''}`}
            onClick={onFavorite}
            title={favorited ? 'お気に入り解除' : 'お気に入り追加'}
          >★</button>
        </div>
        <div className="article-td col-queue">
          <button
            className={`queue-btn${queued ? ' is-queued' : ''}`}
            onClick={onQueue}
            title={queued ? '後で読むに追加済み' : '後で読むに追加'}
          >{queued ? '✓' : '+'}</button>
        </div>
        <div className="article-td col-memo">
          <button
            className={`memo-btn${hasMemo ? ' has-memo' : ''}${memoOpen ? ' is-open' : ''}`}
            onClick={() => setMemoOpen(v => !v)}
            title={hasMemo ? 'メモあり（クリックで編集）' : 'メモを追加'}
          >✎</button>
        </div>
        <div className="article-td col-myrating">
          <UserRatingStars id={article.id} rating={userRating} onSet={onUserRating} />
        </div>
      </div>
      {memoOpen && (
        <div className="memo-expand-row">
          <div className="memo-expand">
            {readDate && (
              <span className="memo-readdate">📅 {formatDate(readDate)} 読了</span>
            )}
            <input
              className="memo-input"
              type="text"
              placeholder="メモを入力..."
              value={memo}
              onChange={e => onMemoChange(article.id, e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  )
}

function ArticleCard({ article, read, onToggle, favorited, onFavorite, memo, onMemoChange, readDate, charCount, rating, queued, onQueue, highlighted }) {
  const [memoOpen, setMemoOpen] = useState(false)
  const title = article.title ?? TITLES[article.branchCode]?.[String(article.number)] ?? ''
  const hasMemo = memo.length > 0

  const cardClass = [
    'article-card',
    read ? 'is-read' : '',
    article.predicted ? 'is-predicted' : '',
    highlighted ? 'is-target-highlight' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass}>
      <div className="card-top">
        <input
          type="checkbox"
          className="scp-checkbox"
          checked={read}
          onChange={onToggle}
        />
        <a
          className="card-desg"
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {article.designation}
        </a>
        <button
          className={`fav-btn${favorited ? ' is-fav' : ''}`}
          onClick={onFavorite}
          title={favorited ? 'お気に入り解除' : 'お気に入り追加'}
        >★</button>
        <button
          className={`queue-btn${queued ? ' is-queued' : ''}`}
          onClick={onQueue}
          title={queued ? '後で読むに追加済み' : '後で読むに追加'}
        >{queued ? '✓' : '+'}</button>
        <button
          className={`memo-btn${hasMemo ? ' has-memo' : ''}${memoOpen ? ' is-open' : ''}`}
          onClick={() => setMemoOpen(v => !v)}
          title={hasMemo ? 'メモあり' : 'メモを追加'}
        >✎</button>
      </div>
      {title && <div className="card-title">{title}</div>}
      <div className="card-meta">
        {charCount != null && <span className="scp-charcount">{formatChars(charCount)}</span>}
        {rating != null && <span className="scp-rating">👍 {rating}</span>}
        {article.predicted
          ? <span className="badge badge-predicted">予測</span>
          : read
            ? <span className="badge badge-read">読了</span>
            : null
        }
      </div>
      {memoOpen && (
        <div className="card-memo">
          {readDate && <span className="memo-readdate">📅 {formatDate(readDate)} 読了</span>}
          <input
            className="memo-input"
            type="text"
            placeholder="メモを入力..."
            value={memo}
            onChange={e => onMemoChange(article.id, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

function MatrixCell({ article, read, onToggle, highlighted }) {
  const label = article.number != null
    ? String(article.number).padStart(3, '0')
    : article.title?.slice(0, 8) ?? article.designation?.slice(0, 8) ?? '---'

  const cellClass = [
    'matrix-cell',
    read ? 'is-read' : '',
    article.predicted ? 'is-predicted' : '',
    highlighted ? 'is-target-highlight' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cellClass}
      title={article.designation + (article.title ? ' — ' + article.title : '')}
    >
      <a
        className="matrix-link-area"
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
      <button
        className="matrix-toggle-btn"
        onClick={onToggle}
        aria-label={read ? '未読に戻す' : '読了にする'}
      >
        {read ? '✓' : '·'}
      </button>
    </div>
  )
}
