import { useState, useMemo } from 'react'
import { lookupArticle } from '../utils/lookupArticle.js'
import CHAR_COUNTS from '../data/char_counts.json'
import RATINGS from '../data/ratings.json'

const JP_BASE = 'http://scp-jp.wikidot.com/'

function getSlug(url) {
  return url?.startsWith(JP_BASE) ? url.slice(JP_BASE.length) : null
}

function fmtChars(n) {
  if (n == null) return null
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万字` : `${n.toLocaleString()}字`
}

export default function FavoritesPage({ favorites, toggleFavorite, onOpenSidebar, isChecked, getUserRating }) {
  const [sortBy,     setSortBy]     = useState('branch')   // 'branch' | 'name'
  const [readFilter, setReadFilter] = useState('all')      // 'all' | 'read' | 'unread'

  const items = useMemo(() => {
    let list = [...favorites].map(id => lookupArticle(id)).filter(Boolean)
    if (readFilter === 'read')   list = list.filter(a => isChecked(a.id))
    if (readFilter === 'unread') list = list.filter(a => !isChecked(a.id))
    if (sortBy === 'name') list = [...list].sort((a, b) => a.designation.localeCompare(b.designation))
    return list
  }, [favorites, sortBy, readFilter, isChecked])

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

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="支部選択">≡</button>
          <span className="toolbar-title">⭐ お気に入り</span>
          <div className="toolbar-spacer" />
          <span className="progress-text" style={{ marginRight: 8 }}>{items.length} 件</span>
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
              >{label}</button>
            ))}
          </div>
          <div className="mark-btns">
            <button
              className={`mark-btn${sortBy === 'branch' ? ' active' : ''}`}
              onClick={() => setSortBy('branch')}
            >支部順</button>
            <button
              className={`mark-btn${sortBy === 'name' ? ' active' : ''}`}
              onClick={() => setSortBy('name')}
            >名前順</button>
          </div>
        </div>
      </div>

      <div className="fav-page">
        {byBranch.every(g => g.articles.length === 0) && (
          <p className="hub-empty">
            {readFilter !== 'all'
              ? `該当するお気に入りはありません`
              : 'お気に入りはまだありません。\n記事一覧の ★ ボタンで追加できます。'}
          </p>
        )}

        {byBranch.map(({ branch, articles }, gi) => {
          if (articles.length === 0) return null
          return (
            <section key={branch?.code ?? gi} className="fav-section">
              {branch && (
                <h2 className="fav-section-title">
                  <span className="fav-branch-badge" style={{ background: branch.accent }}>
                    {branch.code}
                  </span>
                  {branch.nativeName}
                </h2>
              )}
              <div className="fav-list">
                {articles.map(article => {
                  const slug      = getSlug(article.url)
                  const charCount = slug ? (CHAR_COUNTS[slug] ?? null) : null
                  const rating    = slug ? (RATINGS[slug]    ?? null) : null
                  const read      = isChecked(article.id)
                  return (
                    <div key={article.id} className={`fav-row${read ? ' is-read' : ''}`}>
                      <span className={`fav-read-dot${read ? ' is-read' : ''}`} title={read ? '読了' : '未読'} />
                      <a
                        className="fav-link"
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="fav-designation">{article.designation}</span>
                        {article.title && <span className="fav-title">{article.title}</span>}
                        {charCount != null && <span className="scp-charcount">{fmtChars(charCount)}</span>}
                        {charCount != null && <span className="scp-readmin">約{Math.ceil(charCount / 500)}分</span>}
                        {rating    != null && <span className="scp-rating">👍 {rating}</span>}
                      </a>
                      {getUserRating?.(article.id) && (
                        <span className="my-rating-badge">
                          {'★'.repeat(getUserRating(article.id))}
                        </span>
                      )}
                      <button
                        className="fav-remove-btn"
                        onClick={() => toggleFavorite(article.id)}
                        title="お気に入りを解除"
                      >★</button>
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
