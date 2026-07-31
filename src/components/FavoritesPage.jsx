import { useState, useMemo } from 'react'
import { lookupArticle } from '../utils/lookupArticle.js'
import { getCharCounts, getRatings, useDataReady } from '../data/dataStore.js'
import Icon from './Icon.jsx'

const JP_BASE = 'http://scp-jp.wikidot.com/'

function getSlug(url) {
  return url?.startsWith(JP_BASE) ? url.slice(JP_BASE.length) : null
}

function fmtChars(n) {
  if (n == null) return null
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万字` : `${n.toLocaleString()}字`
}

export default function FavoritesPage({ favorites, toggleFavorite, onOpenSidebar, isChecked, getUserRating, onArticleOpen }) {
  const [sortBy,     setSortBy]     = useState('branch')   // 'branch' | 'name'
  const [readFilter, setReadFilter] = useState('all')      // 'all' | 'read' | 'unread'
  const [removalStatus, setRemovalStatus] = useState('')
  const dataReady = useDataReady() // データ到着後にタイトル等を反映

  const items = useMemo(() => {
    let list = [...favorites].map(id => lookupArticle(id)).filter(Boolean)
    if (readFilter === 'read')   list = list.filter(a => isChecked(a.id))
    if (readFilter === 'unread') list = list.filter(a => !isChecked(a.id))
    if (sortBy === 'name') list = [...list].sort((a, b) => a.designation.localeCompare(b.designation))
    return list
  }, [favorites, sortBy, readFilter, isChecked, dataReady])

  const byBranch = useMemo(() => {
    if (sortBy === 'name') {
      // Single flat list when sorting by name
      return [{ branch: null, articles: items }]
    }
    const map = new Map()
    for (const item of items) {
      const code = item.branch.code
      if (!map.has(code)) map.set(code, { branch: item.branch, articles: [] })
      map.get(code).articles.push(item)
    }
    return [...map.values()]
  }, [items, sortBy])

  function removeFavorite(article) {
    const rows = [...document.querySelectorAll('[data-favorite-id]')]
    const index = rows.findIndex(row => row.dataset.favoriteId === article.id)
    const focusId = rows[index + 1]?.dataset.favoriteId ?? rows[index - 1]?.dataset.favoriteId
    toggleFavorite(article.id)
    setRemovalStatus(`${article.designation}をお気に入りから解除しました。`)
    requestAnimationFrame(() => {
      const target = [...document.querySelectorAll('[data-favorite-id]')]
        .find(row => row.dataset.favoriteId === focusId)
      target?.querySelector('.fav-remove-btn')?.focus()
      if (!target) document.querySelector('[data-view-heading]')?.focus()
    })
  }

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="支部を選択">
            <Icon name="menu" />
          </button>
          <h1 className="toolbar-title" data-view-heading tabIndex={-1}>
            <Icon name="star" />
            <span>お気に入り</span>
          </h1>
          <div className="toolbar-spacer" />
          <span className="progress-text toolbar-count">{items.length} 件</span>
        </div>
        <div className="toolbar-row toolbar-row-bottom">
          <div className="filter-tabs">
            {[
              { key: 'all',    label: '全て' },
              { key: 'read',   label: '読了' },
              { key: 'unread', label: '未読' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`filter-tab${readFilter === key ? ' active' : ''}`}
                onClick={() => setReadFilter(key)}
                aria-pressed={readFilter === key}
              >{label}</button>
            ))}
          </div>
          <div className="mark-btns">
            <button
              className={`mark-btn${sortBy === 'branch' ? ' active' : ''}`}
              onClick={() => setSortBy('branch')}
              aria-pressed={sortBy === 'branch'}
            >支部順</button>
            <button
              className={`mark-btn${sortBy === 'name' ? ' active' : ''}`}
              onClick={() => setSortBy('name')}
              aria-pressed={sortBy === 'name'}
            >名前順</button>
          </div>
        </div>
      </div>

      <div className="fav-page">
        <span className="sr-only" aria-live="polite">{removalStatus}</span>
        {byBranch.every(g => g.articles.length === 0) && (
          <p className="hub-empty">
            {readFilter !== 'all'
              ? `該当するお気に入りはありません`
              : 'お気に入りはまだありません。記事一覧の「お気に入り」ボタンで追加できます。'}
          </p>
        )}

        {byBranch.map(({ branch, articles }, gi) => {
          if (articles.length === 0) return null
          return (
            <section key={branch?.code ?? gi} className="fav-section">
              {branch && (
                <h2 className="fav-section-title">
                  <span className="fav-branch-badge">
                    {branch.code}
                  </span>
                  {branch.nativeName}
                </h2>
              )}
              <div className="fav-list">
                {articles.map(article => {
                  const slug      = getSlug(article.url)
                  const charCount = slug ? (getCharCounts()[slug] ?? null) : null
                  const rating    = slug ? (getRatings()[slug]    ?? null) : null
                  const read      = isChecked(article.id)
                  return (
                    <div key={article.id} className={`fav-row${read ? ' is-read' : ''}`} data-favorite-id={article.id}>
                      <span className={`fav-read-dot${read ? ' is-read' : ''}`} title={read ? '読了' : '未読'} aria-hidden="true" />
                      <a
                        className="fav-link"
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onArticleOpen?.(article, { source: 'favorites' })}
                      >
                        <span className="sr-only">{read ? '読了: ' : '未読: '}</span>
                        <span className="fav-designation">{article.designation}</span>
                        {article.title && <span className="fav-title">{article.title}</span>}
                        {charCount != null && <span className="scp-charcount">{fmtChars(charCount)}</span>}
                        {charCount != null && <span className="scp-readmin">約{Math.ceil(charCount / 500)}分</span>}
                        {rating    != null && <span className="scp-rating">評価 {rating}</span>}
                      </a>
                      {getUserRating?.(article.id) && (
                        <span className="my-rating-badge">
                          マイ評価 {getUserRating(article.id)} / 5
                        </span>
                      )}
                      <button
                        className="fav-remove-btn"
                        onClick={() => removeFavorite(article)}
                        title="お気に入りを解除"
                        aria-label={`${article.designation}をお気に入りから解除`}
                        aria-pressed={true}
                      >
                        <Icon name="star" size={17} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
