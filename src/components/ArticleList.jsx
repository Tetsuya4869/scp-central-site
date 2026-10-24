import { memo, useEffect, useMemo, useState } from 'react'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import { getTitles, useDataReady } from '../data/dataStore.js'
import { isCatalogArticle } from '../utils/catalog.js'

const CUSTOM_PAGE_SIZE = 1000

export default function ArticleList({
  branch, series, isChecked, toggle, isFavorite, toggleFavorite,
  getMemo, setMemo, getReadDate, targetId,
}) {
  const dataReady = useDataReady()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [highlightedId, setHighlightedId] = useState(targetId)
  const [pendingScrollId, setPendingScrollId] = useState(null)

  const articles = useMemo(() => {
    const source = series.type === 'custom'
      ? series.articles
      : generateSeriesArticles(branch.code, series.min, series.max)
    const unique = new Map()
    for (const article of source) {
      if (!article?.id || unique.has(article.id)) continue
      unique.set(article.id, {
        ...article,
        title: article.title ?? getTitles()[branch.code]?.[String(article.number)] ?? '',
        predicted: Boolean(article.predicted) || !isCatalogArticle(article.id),
      })
    }
    return [...unique.values()]
  }, [branch.code, series, dataReady])

  const availableArticles = useMemo(() => articles.filter(article => !article.predicted), [articles])
  const readCount = availableArticles.filter(article => isChecked(article.id)).length
  const total = availableArticles.length
  const percent = total ? readCount / total * 100 : 0
  const percentText = percent > 0 && percent < 0.1 ? '0.1%未満' : `${Math.round(percent * 10) / 10}%`
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleArticles = useMemo(() => articles.filter(article => {
    if (filter !== 'all' && article.predicted) return false
    if (filter === 'read' && !isChecked(article.id)) return false
    if (filter === 'unread' && isChecked(article.id)) return false
    if (!normalizedQuery) return true
    return `${article.designation} ${article.title}`.toLocaleLowerCase().includes(normalizedQuery)
  }), [articles, filter, isChecked, normalizedQuery])

  // Numbered SCP series remain a single list. Large custom collections use
  // 1000-row pages so tales and anomalous-item lists stay practical as well.
  const pageCount = series.type === 'custom'
    ? Math.max(1, Math.ceil(visibleArticles.length / CUSTOM_PAGE_SIZE))
    : 1
  const currentPage = Math.min(page, pageCount - 1)
  const pageStart = currentPage * CUSTOM_PAGE_SIZE
  const displayedArticles = pageCount > 1
    ? visibleArticles.slice(pageStart, pageStart + CUSTOM_PAGE_SIZE)
    : visibleArticles

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage)
  }, [page, currentPage])

  useEffect(() => {
    if (!targetId) return undefined
    setFilter('all')
    setQuery('')
    const targetIndex = articles.findIndex(article => article.id === targetId)
    setPage(series.type === 'custom' && targetIndex >= 0 ? Math.floor(targetIndex / CUSTOM_PAGE_SIZE) : 0)
    setHighlightedId(targetId)
    setPendingScrollId(targetIndex >= 0 ? targetId : null)
    const timer = setTimeout(() => setHighlightedId(null), 2500)
    return () => clearTimeout(timer)
  }, [targetId, articles, series.type])

  const scrollTargetIsDisplayed = pendingScrollId != null
    && displayedArticles.some(article => article.id === pendingScrollId)
  useEffect(() => {
    if (!pendingScrollId || !scrollTargetIsDisplayed) return undefined
    // Wait for the selected page to commit before looking up the target row.
    // A second alignment after painting also settles content-visibility sizing.
    let settledFrame
    const frame = requestAnimationFrame(() => {
      const row = document.getElementById(`article-${pendingScrollId}`)
      if (!row) return
      row.scrollIntoView({ block: 'center', behavior: 'auto' })
      row.querySelector('a')?.focus({ preventScroll: true })
      settledFrame = requestAnimationFrame(() => {
        row.scrollIntoView({ block: 'center', behavior: 'auto' })
        setPendingScrollId(null)
      })
    })
    return () => {
      cancelAnimationFrame(frame)
      if (settledFrame) cancelAnimationFrame(settledFrame)
    }
  }, [pendingScrollId, scrollTargetIsDisplayed, currentPage])

  function changePage(nextPage) {
    setPage(nextPage)
    document.getElementById('checklist-heading')?.scrollIntoView({ block: 'start' })
  }

  const pagination = position => pageCount > 1 && (
    <nav className="tracker-pagination" aria-label={`記事一覧のページ切り替え（${position}）`}>
      <button type="button" disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)} aria-controls="checklist-articles">前へ</button>
      <span>{currentPage + 1} / {pageCount} ページ</span>
      <button type="button" disabled={currentPage === pageCount - 1} onClick={() => changePage(currentPage + 1)} aria-controls="checklist-articles">次へ</button>
    </nav>
  )

  return (
    <section className="checklist-page" aria-labelledby="checklist-heading">
      <div className="tracker-page-heading">
        <h1 id="checklist-heading" data-view-heading tabIndex={-1}>{series.label}</h1>
        <span className="tracker-muted">{branch.nativeName}</span>
      </div>

      <div className="tracker-series-progress">
        <span>この一覧の読了 <strong>{readCount.toLocaleString()}</strong> / {total.toLocaleString()} 件 <strong>{percentText}</strong></span>
        <progress max={total || 1} value={readCount} aria-label={`${series.label}の読了進捗`} />
      </div>

      <div className="tracker-filters">
        <div className="tracker-filter-tabs" aria-label="読了状態で絞り込み">
          {[
            ['all', 'すべて'], ['unread', '未読'], ['read', '読了'],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setFilter(value); setPage(0) }} aria-pressed={filter === value}>{label}</button>
          ))}
        </div>
        <label className="tracker-search-label">
          <span className="sr-only">この一覧を番号・タイトルで検索</span>
          <input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0) }} placeholder="番号・タイトル" />
        </label>
      </div>
      <p className="tracker-muted tracker-result-count" role="status">{pageCount > 1 ? `${(pageStart + 1).toLocaleString()}〜${(pageStart + displayedArticles.length).toLocaleString()} / ${visibleArticles.length.toLocaleString()} 件表示` : `${visibleArticles.length.toLocaleString()} 件表示`}</p>
      {pagination('上')}

      <div id="checklist-articles" className="tracker-list" role="list" aria-label={`${series.label}の記事一覧`}>
        {visibleArticles.length === 0 && <p className="tracker-empty">条件に一致する記事はありません。</p>}
        {displayedArticles.map(article => (
          <ArticleRow
            key={article.id}
            article={article}
            read={isChecked(article.id)}
            favorite={isFavorite(article.id)}
            toggle={toggle}
            toggleFavorite={toggleFavorite}
            memo={getMemo?.(article.id) ?? ''}
            setMemo={setMemo}
            readDate={getReadDate?.(article.id)?.getTime()}
            highlighted={highlightedId === article.id}
          />
        ))}
      </div>
      {pagination('下')}
    </section>
  )
}

const ArticleRow = memo(function ArticleRow({ article, read, favorite, toggle, toggleFavorite, memo, setMemo, readDate, highlighted }) {
  const [memoOpen, setMemoOpen] = useState(false)
  return (
    <div id={`article-${article.id}`} role="listitem" className={`checklist-row${read ? ' is-read' : ''}${article.predicted ? ' is-predicted' : ''}${highlighted ? ' is-highlighted' : ''}`}>
      <label className="checklist-read" title={article.predicted ? '公開未確認の記事です' : read ? '読了済み' : '未読'}>
        <input type="checkbox" checked={read && !article.predicted} disabled={article.predicted} onChange={() => toggle(article.id)} aria-label={`${article.designation}の読了`} />
        <span className="sr-only">{read ? '読了' : '未読'}</span>
      </label>
      <a className="checklist-article" href={article.url} target="_blank" rel="noopener noreferrer">
        <strong>{article.designation}</strong>
        {article.title && <span>{article.title}</span>}
        {article.predicted && <small>公開未確認</small>}
        {read && !article.predicted && <small className="checklist-read-status">読了{Number.isFinite(readDate) ? ` ${new Date(readDate).toLocaleDateString('ja-JP')}` : ''}</small>}
      </a>
      <button className="checklist-favorite" type="button" disabled={article.predicted} onClick={() => toggleFavorite(article.id)} aria-pressed={favorite} aria-label={`${article.designation}をお気に入り${favorite ? 'から解除' : 'に登録'}`} title={favorite ? 'お気に入りから解除' : 'お気に入りに登録'}>{favorite ? '★' : '☆'}</button>
      {!article.predicted && setMemo && (
        <details className="checklist-memo" open={memoOpen} onToggle={event => setMemoOpen(event.currentTarget.open)}>
          <summary aria-label={`${article.designation}のメモ`}>{memo ? 'メモあり' : 'メモ'}</summary>
          {memoOpen && (
            <label>
              <span>{article.designation}のメモ</span>
              <textarea value={memo} onChange={event => setMemo(article.id, event.target.value)} rows={3} />
            </label>
          )}
        </details>
      )}
    </div>
  )
})
