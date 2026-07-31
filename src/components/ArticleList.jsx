import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import { getTitles, getCharCounts, getRatings, useDataReady } from '../data/dataStore.js'
import Icon from './Icon.jsx'

const JP_BASE = 'http://scp-jp.wikidot.com/'
const CARD_COLS = 2
const MATRIX_COLS = 8
const PAGE_SIZE = 120

function preferredScrollBehavior() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'auto'
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

function getSlug(article) {
  return article.url.startsWith(JP_BASE) ? article.url.slice(JP_BASE.length) : null
}

function getCharCount(article) {
  const slug = getSlug(article)
  return slug ? (getCharCounts()[slug] ?? null) : null
}

function getRating(article) {
  const slug = getSlug(article)
  return slug ? (getRatings()[slug] ?? null) : null
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
  dates,
  onArticleOpen,
}) {
  const dataReady = useDataReady() // データ到着時に再描画してタイトル/文字数/評価を反映
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('number')
  const [jumpValue, setJumpValue] = useState('')
  const [jumpStatus, setJumpStatus] = useState('')
  const [highlightedId, setHighlightedId] = useState(null)
  const [confirmUnmark, setConfirmUnmark] = useState(false)
  const [charFilter, setCharFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [page, setPage] = useState(0)
  const confirmUnmarkTimerRef = useRef(null)
  const parentRef = useRef(null)
  const highlightTimerRef = useRef(null)

  const allArticles = useMemo(() => {
    const source = series.type === 'custom'
      ? series.articles.map(article => ({ ...article, predicted: Boolean(article.predicted) }))
      : generateSeriesArticles(branch.code, series.min, series.max)
    const unique = new Map()
    for (const article of source) {
      if (article?.id && !unique.has(article.id)) unique.set(article.id, article)
    }
    return [...unique.values()]
  }, [branch.code, series])

  // Predicted rows stay discoverable, but do not count as readable catalogue entries.
  const availableArticles = useMemo(
    () => allArticles.filter(article => !article.predicted),
    [allArticles]
  )
  const availableIds = useMemo(
    () => availableArticles.map(article => article.id),
    [availableArticles]
  )

  const filtered = useMemo(() => {
    let list = filter === 'all' ? allArticles : availableArticles
    if (filter === 'read')   list = list.filter(a => isChecked(a.id))
    if (filter === 'unread') list = list.filter(a => !isChecked(a.id))
    if (filter === 'rated')  list = list.filter(a => hasUserRating?.(a.id))

    if (charFilter !== 'all') {
      list = list.filter(a => {
        const c = getCharCount(a)
        if (charFilter === 'short')  return c != null && c <= 5000
        if (charFilter === 'medium') return c != null && c > 5000 && c <= 30000
        if (charFilter === 'long')   return c != null && c > 30000
        return true
      })
    }
    if (ratingFilter !== 'all') {
      const min = ratingFilter === 'popular' ? 50 : ratingFilter === 'high' ? 100 : 200
      list = list.filter(a => { const r = getRating(a); return r != null && r >= min })
    }

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
  }, [allArticles, availableArticles, filter, charFilter, ratingFilter, sortBy, isChecked, hasUserRating, getUserRating, dataReady])

  const cols = layoutMode === 'card' ? CARD_COLS : layoutMode === 'matrix' ? MATRIX_COLS : 1
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const pageStart = currentPage * PAGE_SIZE
  const pagedArticles = useMemo(
    () => filtered.slice(pageStart, pageStart + PAGE_SIZE),
    [filtered, pageStart]
  )

  useEffect(() => {
    if (page >= pageCount) setPage(pageCount - 1)
  }, [page, pageCount])

  const displayRows = useMemo(() => {
    const rows = []
    for (let i = 0; i < pagedArticles.length; i += cols) {
      rows.push(pagedArticles.slice(i, i + cols))
    }
    return rows
  }, [pagedArticles, cols])

  // Jump to targetId on mount (from search navigation)
  useEffect(() => {
    if (!targetId) return
    const idx = filtered.findIndex(a => a.id === targetId)
    if (idx === -1) return
    setPage(Math.floor(idx / PAGE_SIZE))
    const t = setTimeout(() => {
      document.getElementById(`article-${targetId}`)?.scrollIntoView({ block: 'center', behavior: preferredScrollBehavior() })
      setHighlightedId(targetId)
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2000)
    }, 80)
    return () => {
      clearTimeout(t)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, []) // run once on mount

  const scrollToAndHighlight = useCallback((id) => {
    const idx = filtered.findIndex(a => a.id === id)
    if (idx === -1) return
    setPage(Math.floor(idx / PAGE_SIZE))
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.getElementById(`article-${id}`)?.scrollIntoView({ block: 'center', behavior: preferredScrollBehavior() })
    }))
    clearTimeout(highlightTimerRef.current)
    setHighlightedId(id)
    highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2000)
  }, [filtered])

  // pickRandom はフィルター変更後の再レンダーを待ってからスクロールする
  // （古い filtered のインデックスで誤った行に飛ぶのを防ぐ）
  const [pendingScrollId, setPendingScrollId] = useState(null)
  useEffect(() => {
    if (!pendingScrollId) return
    scrollToAndHighlight(pendingScrollId)
    setPendingScrollId(null)
  }, [pendingScrollId, scrollToAndHighlight])

  const pickRandom = useCallback(() => {
    const unread = availableArticles.filter(a => !isChecked(a.id))
    if (!unread.length) return
    const pick = unread[Math.floor(Math.random() * unread.length)]
    // show all articles so the pick is always visible
    setFilter('all')
    setCharFilter('all')
    setRatingFilter('all')
    setJumpStatus(`${pick.designation}を選びました。`)
    setPendingScrollId(pick.id)
  }, [availableArticles, isChecked])

  // unmount時に保留中のタイマーを破棄
  useEffect(() => () => {
    clearTimeout(confirmUnmarkTimerRef.current)
    clearTimeout(highlightTimerRef.current)
  }, [])

  const readCount = useMemo(
    () => availableArticles.filter(a => isChecked(a.id)).length,
    [availableArticles, isChecked]
  )
  const pct = availableArticles.length > 0
    ? Math.round((readCount / availableArticles.length) * 100)
    : 0

  function changeLayout(newMode) {
    setLayoutMode(newMode)
    setPage(0)
    if (parentRef.current) parentRef.current.scrollTop = 0
  }

  function handleFilter(f) {
    setFilter(f)
    setPage(0)
    if (parentRef.current) parentRef.current.scrollTop = 0
  }

  function cycleCharsSort() {
    const next = sortBy === 'chars-asc' ? 'chars-desc' : sortBy === 'chars-desc' ? 'number' : 'chars-asc'
    setSortBy(next)
    setPage(0)
    if (parentRef.current) parentRef.current.scrollTop = 0
  }

  function cycleRatingSort() {
    const next = sortBy === 'rating-asc' ? 'rating-desc' : sortBy === 'rating-desc' ? 'number' : 'rating-asc'
    setSortBy(next)
    setPage(0)
    if (parentRef.current) parentRef.current.scrollTop = 0
  }

  function cycleMyRatingSort() {
    const next = sortBy === 'myrating-asc' ? 'myrating-desc' : sortBy === 'myrating-desc' ? 'number' : 'myrating-asc'
    setSortBy(next)
    setPage(0)
    if (parentRef.current) parentRef.current.scrollTop = 0
  }

  const handleToggle = useCallback((id) => toggle(id), [toggle])

  function handleJump(e) {
    if (e.key !== 'Enter') return
    const val = jumpValue.trim().toLowerCase()
    if (!val) {
      setJumpStatus('番号または名前を入力してください。')
      return
    }

    const numOnly = val.replace(/[^0-9]/g, '')
    const numVal = numOnly ? parseInt(numOnly, 10) : NaN
    let idx = -1

    if (!isNaN(numVal)) {
      idx = allArticles.findIndex(a => a.number === numVal)
      if (idx === -1) {
        const padded = String(numVal).padStart(3, '0')
        idx = allArticles.findIndex(a => a.designation?.toLowerCase().includes(padded))
      }
    }
    if (idx === -1) {
      idx = allArticles.findIndex(a =>
        a.designation?.toLowerCase().includes(val) ||
        (a.title ?? getTitles()[a.branchCode]?.[String(a.number)] ?? '').toLowerCase().includes(val)
      )
    }

    if (idx !== -1) {
      const article = allArticles[idx]
      setFilter('all')
      setCharFilter('all')
      setRatingFilter('all')
      setPendingScrollId(article.id)
      setJumpStatus(`${article.designation}へ移動しました。`)
      setJumpValue('')
    } else {
      setJumpStatus(`「${jumpValue.trim()}」に一致する記事はありません。`)
    }
  }

  function goToPage(nextPage) {
    setPage(Math.max(0, Math.min(nextPage, pageCount - 1)))
    if (parentRef.current) parentRef.current.scrollTop = 0
  }

  const hubUrl = branch.domain + series.hub

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="支部を選択">
            <Icon name="menu" />
          </button>
          <h1 className="toolbar-title" data-view-heading tabIndex={-1}>{series.label}</h1>
          <span className="toolbar-sub"> · {branch.nativeName}</span>
          <a className="toolbar-hub-link" href={hubUrl} target="_blank" rel="noopener noreferrer">
            <span>ハブ</span>
            <Icon name="external" size={16} />
          </a>
          <div className="toolbar-spacer" />
          <div className="series-progress">
            <div
              className="progress-bar-wrap"
              role="progressbar"
              aria-label={`${series.label}の読了進捗`}
              aria-valuemin="0"
              aria-valuemax={availableArticles.length}
              aria-valuenow={readCount}
            >
              <div
                className="progress-bar-fill"
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="progress-text">{readCount}</span>
            <span className="progress-denom">/{availableArticles.length} ({pct}%)</span>
          </div>
        </div>

        {/* The frequent choices stay visible; secondary operations are disclosed below. */}
        <div className="toolbar-row toolbar-row-controls">
          {[
            { key: 'list',   label: 'リスト',   description: '行一覧で表示' },
            { key: 'card',   label: 'カード',   description: '詳細カードで表示' },
            { key: 'matrix', label: 'グリッド', description: '全体表示（記事を開く・読了のみ）' },
          ].map(({ key, label, description }) => (
            <button
              key={key}
              className={`layout-tab${layoutMode === key ? ' active' : ''}`}
              onClick={() => changeLayout(key)}
              aria-pressed={layoutMode === key}
              aria-label={description}
              title={description}
            >
              <span className="layout-tab-label">{label}</span>
            </button>
          ))}

          {layoutMode === 'matrix' && (
            <span className="layout-mode-note">開く・読了に絞った俯瞰表示</span>
          )}

          <span className="toolbar-sep" />

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
                aria-pressed={filter === key}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            className={`mark-btn${filterPanelOpen ? ' active' : ''}${charFilter !== 'all' || ratingFilter !== 'all' ? ' filter-active' : ''}`}
            onClick={() => setFilterPanelOpen(v => !v)}
            title="並べ替え・一括操作・絞り込み"
            aria-expanded={filterPanelOpen}
            aria-controls="article-filter-panel"
          >
            <span>操作</span>
            <Icon name={filterPanelOpen ? 'up' : 'down'} size={15} />
          </button>
          <span id="article-jump-status" className="sr-only" aria-live="polite">{jumpStatus}</span>
        </div>

        {filterPanelOpen && (
          <div className="filter-panel" id="article-filter-panel">
            {layoutMode !== 'matrix' && (
              <div className="filter-panel-row">
                <span className="filter-panel-label">並べ替え</span>
                <button className={`mark-btn${sortBy.startsWith('chars') ? ' active' : ''}`} onClick={cycleCharsSort}>
                  {sortBy === 'chars-asc' ? '文字数・昇順' : sortBy === 'chars-desc' ? '文字数・降順' : '文字数順'}
                </button>
                <button className={`mark-btn${sortBy.startsWith('rating') ? ' active' : ''}`} onClick={cycleRatingSort}>
                  {sortBy === 'rating-asc' ? '評価・昇順' : sortBy === 'rating-desc' ? '評価・降順' : '評価順'}
                </button>
                <button className={`mark-btn${sortBy.startsWith('myrating') ? ' active' : ''}`} onClick={cycleMyRatingSort}>
                  {sortBy === 'myrating-asc' ? 'マイ評価・昇順' : sortBy === 'myrating-desc' ? 'マイ評価・降順' : 'マイ評価順'}
                </button>
              </div>
            )}
            <div className="filter-panel-row">
              <span className="filter-panel-label">読書操作</span>
              <button className="mark-btn" onClick={() => markAll(availableIds, true)} disabled={availableIds.length === 0}>
                公開済みを全て読了
              </button>
              <button
                className={`mark-btn${confirmUnmark ? ' mark-btn-confirm' : ''}`}
                onClick={() => {
                  if (confirmUnmark) {
                    clearTimeout(confirmUnmarkTimerRef.current)
                    setConfirmUnmark(false)
                    markAll(availableIds, false)
                  } else {
                    setConfirmUnmark(true)
                    clearTimeout(confirmUnmarkTimerRef.current)
                    confirmUnmarkTimerRef.current = setTimeout(() => setConfirmUnmark(false), 3000)
                  }
                }}
                disabled={availableIds.length === 0}
              >{confirmUnmark ? '公開済みの読了を解除' : '読了を全解除'}</button>
              <button
                className="toolbar-dice-btn"
                onClick={pickRandom}
                disabled={availableArticles.every(a => isChecked(a.id))}
              >
                <Icon name="target" size={17} />
                <span>未読をランダム選択</span>
              </button>
            </div>
            {layoutMode !== 'matrix' && (
              <div className="filter-panel-row">
                <label className="filter-panel-label" htmlFor="article-jump-input">記事へ移動</label>
                <div className="jump-control">
                  <input
                    id="article-jump-input"
                    className="jump-input"
                    type="text"
                    inputMode="search"
                    placeholder="番号/名前を入力して Enter"
                    aria-describedby="article-jump-status"
                    value={jumpValue}
                    onChange={e => { setJumpValue(e.target.value); setJumpStatus('') }}
                    onKeyDown={handleJump}
                  />
                  <span className="field-helper jump-status" aria-hidden="true">{jumpStatus}</span>
                </div>
              </div>
            )}
            <div className="filter-panel-row">
              <span className="filter-panel-label">文字数</span>
              {[
                { key: 'all', label: '全て' },
                { key: 'short', label: '〜5千字' },
                { key: 'medium', label: '5千〜3万字' },
                { key: 'long', label: '3万字〜' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`filter-tab${charFilter === key ? ' active' : ''}`}
                  onClick={() => { setCharFilter(key); setPage(0) }}
                  aria-pressed={charFilter === key}
                >{label}</button>
              ))}
            </div>
            <div className="filter-panel-row">
              <span className="filter-panel-label">評価</span>
              {[
                { key: 'all', label: '全て' },
                { key: 'popular', label: '+50以上' },
                { key: 'high', label: '+100以上' },
                { key: 'top', label: '+200以上' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  className={`filter-tab${ratingFilter === key ? ' active' : ''}`}
                  onClick={() => { setRatingFilter(key); setPage(0) }}
                  aria-pressed={ratingFilter === key}
                >{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {layoutMode === 'list' && (
        <div className="article-header-row">
          <div className="article-th col-num">No.</div>
          <div className="article-th col-badges">状態</div>
          <div className="article-th col-fav">保存</div>
          <div className="article-th col-queue">後で</div>
          <div className="article-th col-memo">メモ</div>
          <div className="article-th col-myrating">マイ評価</div>
          <div className="article-th col-check">読了</div>
        </div>
      )}

      <div ref={parentRef} className="article-list-wrap" role="list" aria-label={`${series.label}の記事一覧、${currentPage + 1}/${pageCount}ページ`}>
        {displayRows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icon name={filter === 'rated' ? 'star' : filter === 'read' ? 'library' : 'search'} size={24} />
            </div>
            <div className="empty-state-title">
              {filter === 'read' ? '読了記事なし' : filter === 'rated' ? '評価済み記事なし' : '未読記事なし'}
            </div>
            <div className="empty-state-hint">
              {filter === 'read' ? '記事を読んでチェックを入れると、ここに表示されます。' :
               filter === 'rated' ? '記事に星評価をつけると、ここに表示されます。' :
               '現在のフィルター条件に一致する未読記事がありません。'}
            </div>
          </div>
        ) : (
          <div className="article-display-rows" role="presentation">
            {displayRows.map((rowArticles, rowIndex) => {
              return (
                <div
                  key={rowArticles.map(article => article.id).join('|')}
                  className="article-display-row"
                  data-index={rowIndex}
                  role="presentation"
                >
                  {layoutMode === 'list' ? (
                    <ArticleRow
                      article={rowArticles[0]}
                      read={isChecked(rowArticles[0].id)}
                      onToggle={() => handleToggle(rowArticles[0].id)}
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
                      position={pageStart + rowIndex + 1}
                      totalItems={filtered.length}
                      onArticleOpen={() => onArticleOpen?.(rowArticles[0], {
                        source: 'series',
                        branchCode: branch.code,
                        seriesId: series.id,
                      })}
                    />
                  ) : layoutMode === 'card' ? (
                    <div className="card-row">
                      {rowArticles.map((article, articleIndex) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          read={isChecked(article.id)}
                          onToggle={() => handleToggle(article.id)}
                          favorited={isFavorite(article.id)}
                          onFavorite={() => toggleFavorite(article.id)}
                          memo={getMemo(article.id)}
                          onMemoChange={setMemo}
                          readDate={getReadDate(article.id)}
                          charCount={getCharCount(article)}
                          rating={getRating(article)}
                          queued={isQueued?.(article.id)}
                          onQueue={() => addToQueue?.(article.id)}
                          userRating={getUserRating?.(article.id)}
                          onUserRating={(id, val) => setUserRating?.(id, val)}
                          highlighted={highlightedId === article.id}
                          position={pageStart + (rowIndex * cols) + articleIndex + 1}
                          totalItems={filtered.length}
                          onArticleOpen={() => onArticleOpen?.(article, {
                            source: 'series',
                            branchCode: branch.code,
                            seriesId: series.id,
                          })}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="matrix-row">
                      {rowArticles.map((article, articleIndex) => (
                        <MatrixCell
                          key={article.id}
                          article={article}
                          read={isChecked(article.id)}
                          onToggle={() => handleToggle(article.id)}
                          highlighted={highlightedId === article.id}
                          position={pageStart + (rowIndex * cols) + articleIndex + 1}
                          totalItems={filtered.length}
                          onArticleOpen={() => onArticleOpen?.(article, {
                            source: 'series',
                            branchCode: branch.code,
                            seriesId: series.id,
                          })}
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
        <span className="list-count">
          全 <strong>{filtered.length}</strong> 件
          {filtered.length > 0 && ` · ${pageStart + 1}〜${Math.min(pageStart + PAGE_SIZE, filtered.length)}件を表示`}
        </span>
        {pageCount > 1 && (
          <nav className="article-pagination" aria-label="記事一覧のページ">
            <button type="button" onClick={() => goToPage(0)} disabled={currentPage === 0} aria-label="先頭ページ">先頭</button>
            <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} aria-label="前のページ">前へ</button>
            <span aria-live="polite">{currentPage + 1} / {pageCount}ページ</span>
            <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === pageCount - 1} aria-label="次のページ">次へ</button>
            <button type="button" onClick={() => goToPage(pageCount - 1)} disabled={currentPage === pageCount - 1} aria-label="末尾ページ">末尾</button>
          </nav>
        )}
      </div>
    </>
  )
}

function UserRatingStars({ id, rating, onSet, disabled = false }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div
      className="user-rating-stars"
      onMouseLeave={() => setHovered(0)}
      role="group"
      aria-label="マイ評価"
    >
      {[1, 2, 3, 4, 5].map(n => (
        <button
          type="button"
          key={n}
          className={`ur-star${(hovered || rating || 0) >= n ? ' filled' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onClick={() => onSet?.(id, rating === n ? null : n)}
          title={disabled ? '公開前の記事には評価できません' : `${n}つ星`}
          aria-label={disabled ? `${n}つ星（公開前のため評価不可）` : `${n}つ星`}
          aria-pressed={rating === n}
          disabled={disabled}
        >
          <Icon name="star" size={15} />
        </button>
      ))}
    </div>
  )
}

function ArticleRow({ article, read, onToggle, favorited, onFavorite, memo, onMemoChange, readDate, charCount, rating, queued, onQueue, userRating, onUserRating, highlighted, onArticleOpen, position, totalItems }) {
  const [memoOpen, setMemoOpen] = useState(false)

  const rowClass = [
    'article-row',
    read ? 'is-read' : '',
    article.predicted ? 'is-predicted' : '',
    highlighted ? 'is-target-highlight' : '',
  ].filter(Boolean).join(' ')

  const title = article.title ?? getTitles()[article.branchCode]?.[String(article.number)] ?? ''
  const hasMemo = memo.length > 0

  return (
    <>
      <div className={rowClass} id={`article-${article.id}`} role="listitem" aria-posinset={position} aria-setsize={totalItems}>
        <a
          className="article-link-zone"
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onArticleOpen}
        >
          <div className="article-td col-num">
            <span className="scp-num-cell">
              <span className="scp-designation">{article.designation}</span>
              {title && <span className="scp-title">{title}</span>}
              {charCount != null && <span className="scp-charcount">{formatChars(charCount)}</span>}
              {charCount != null && <span className="scp-readmin">約{Math.ceil(charCount / 500)}分</span>}
              {rating != null && <span className="scp-rating">評価 {rating}</span>}
            </span>
          </div>
          <div className="article-td col-badges">
            {article.predicted
              ? <span className="badge badge-predicted">予測</span>
              : read
                ? <span className="badge badge-read">読了</span>
                : null
            }
          </div>
        </a>
        <div className="article-td col-fav">
          <button
            className={`fav-btn${favorited ? ' is-favorite' : ''}`}
            onClick={onFavorite}
            title={favorited ? 'お気に入り解除' : 'お気に入り追加'}
            aria-label={`${article.designation}を${favorited ? 'お気に入りから解除' : 'お気に入りに追加'}`}
            aria-pressed={favorited}
            disabled={article.predicted}
          >
            <Icon name="star" size={17} />
          </button>
        </div>
        <div className="article-td col-queue">
          <button
            className={`queue-btn${queued ? ' is-queued' : ''}`}
            onClick={onQueue}
            title={queued ? '後で読むから削除' : '後で読むに追加'}
            aria-label={`${article.designation}を${queued ? '後で読むから削除' : '後で読むに追加'}`}
            aria-pressed={queued}
            disabled={article.predicted}
          >
            <Icon name={queued ? 'check' : 'plus'} size={17} />
          </button>
        </div>
        <div className="article-td col-memo">
          <button
            className={`memo-btn${hasMemo ? ' has-memo' : ''}${memoOpen ? ' is-open' : ''}`}
            onClick={() => !article.predicted && setMemoOpen(v => !v)}
            title={hasMemo ? 'メモあり（クリックで編集）' : 'メモを追加'}
            aria-label={`${article.designation}の${hasMemo ? 'メモを編集' : 'メモを追加'}`}
            aria-expanded={memoOpen}
            disabled={article.predicted}
          >
            <Icon name="note" size={17} />
          </button>
        </div>
        <div className="article-td col-myrating">
          <UserRatingStars id={article.id} rating={userRating} onSet={onUserRating} disabled={article.predicted} />
        </div>
        <div className="article-td col-check">
          <button
            className={`read-toggle-btn${read ? ' is-read' : ''}`}
            onClick={onToggle}
            aria-label={`${article.designation}を${read ? '未読に戻す' : '読了にする'}`}
            aria-pressed={read}
            disabled={article.predicted}
          >{read && <Icon name="check" size={17} />}</button>
        </div>
      </div>
      {memoOpen && (
        <div className="memo-expand-row">
          <div className="memo-expand">
            {readDate && (
              <span className="memo-readdate">読了日 {formatDate(readDate)}</span>
            )}
            <input
              className="memo-input"
              type="text"
              placeholder="メモを入力..."
              aria-label={`${article.designation}のメモ`}
              value={memo}
              onChange={e => onMemoChange(article.id, e.target.value)}
            />
          </div>
        </div>
      )}
    </>
  )
}

function ArticleCard({ article, read, onToggle, favorited, onFavorite, memo, onMemoChange, readDate, charCount, rating, queued, onQueue, userRating, onUserRating, highlighted, onArticleOpen, position, totalItems }) {
  const [memoOpen, setMemoOpen] = useState(false)
  const title = article.title ?? getTitles()[article.branchCode]?.[String(article.number)] ?? ''
  const hasMemo = memo.length > 0

  const cardClass = [
    'article-card',
    read ? 'is-read' : '',
    article.predicted ? 'is-predicted' : '',
    highlighted ? 'is-target-highlight' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClass} id={`article-${article.id}`} role="listitem" aria-posinset={position} aria-setsize={totalItems}>
      <div className="card-top">
        <a
          className="card-desg"
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onArticleOpen}
        >
          {article.designation}
        </a>
        <button
          className={`fav-btn${favorited ? ' is-favorite' : ''}`}
          onClick={onFavorite}
          title={favorited ? 'お気に入り解除' : 'お気に入り追加'}
          aria-label={`${article.designation}を${favorited ? 'お気に入りから解除' : 'お気に入りに追加'}`}
          aria-pressed={favorited}
          disabled={article.predicted}
        >
          <Icon name="star" size={17} />
        </button>
        <button
          className={`queue-btn${queued ? ' is-queued' : ''}`}
          onClick={onQueue}
          title={queued ? '後で読むから削除' : '後で読むに追加'}
          aria-label={`${article.designation}を${queued ? '後で読むから削除' : '後で読むに追加'}`}
          aria-pressed={queued}
          disabled={article.predicted}
        >
          <Icon name={queued ? 'check' : 'plus'} size={17} />
        </button>
        <button
          className={`memo-btn${hasMemo ? ' has-memo' : ''}${memoOpen ? ' is-open' : ''}`}
          onClick={() => !article.predicted && setMemoOpen(v => !v)}
          title={hasMemo ? 'メモあり' : 'メモを追加'}
          aria-label={`${article.designation}の${hasMemo ? 'メモを編集' : 'メモを追加'}`}
          aria-expanded={memoOpen}
          disabled={article.predicted}
        >
          <Icon name="note" size={17} />
        </button>
      </div>
      {title && (
        <a
          className="card-title"
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onArticleOpen}
        >{title}</a>
      )}
      <div className="card-meta">
        {charCount != null && <span className="scp-charcount">{formatChars(charCount)}</span>}
        {charCount != null && <span className="scp-readmin">約{Math.ceil(charCount / 500)}分</span>}
        {rating != null && <span className="scp-rating">評価 {rating}</span>}
        {article.predicted && <span className="badge badge-predicted">予測</span>}
        <UserRatingStars id={article.id} rating={userRating} onSet={onUserRating} disabled={article.predicted} />
        <span className="card-meta-spacer" />
        <button
          className={`card-read-btn${read ? ' is-read' : ''}`}
          onClick={onToggle}
          aria-label={`${article.designation}を${read ? '未読に戻す' : '読了にする'}`}
          aria-pressed={read}
          disabled={article.predicted}
        >
          {read && <Icon name="check" size={15} />}
          <span>{read ? '読了' : '未読'}</span>
        </button>
      </div>
      {memoOpen && (
        <div className="card-memo">
          {readDate && <span className="memo-readdate">読了日 {formatDate(readDate)}</span>}
          <input
            className="memo-input"
            type="text"
            placeholder="メモを入力..."
            aria-label={`${article.designation}のメモ`}
            value={memo}
            onChange={e => onMemoChange(article.id, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

function MatrixCell({ article, read, onToggle, highlighted, onArticleOpen, position, totalItems }) {
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
      id={`article-${article.id}`}
      role="listitem"
      aria-posinset={position}
      aria-setsize={totalItems}
      title={article.designation + (article.title ? ' — ' + article.title : '')}
    >
      <a
        className="matrix-link-area"
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onArticleOpen}
      >
        {label}
      </a>
      <button
        className="matrix-toggle-btn"
        onClick={onToggle}
        aria-label={`${article.designation}を${read ? '未読に戻す' : '読了にする'}`}
        aria-pressed={read}
        disabled={article.predicted}
      >
        {read && <Icon name="check" size={15} />}
      </button>
    </div>
  )
}
