import { useMemo, useState } from 'react'
import { useDataReady } from '../data/dataStore.js'
import { isCatalogArticle } from '../utils/catalog.js'
import { lookupArticle } from '../utils/lookupArticle.js'

export default function FavoritesPage({ favorites, toggleFavorite, isChecked, toggle }) {
  const dataReady = useDataReady()
  const [query, setQuery] = useState('')
  const [readFilter, setReadFilter] = useState('all')
  const [status, setStatus] = useState('')

  const allItems = useMemo(() => [...favorites]
    .map(id => lookupArticle(id))
    .filter(Boolean)
    .sort((a, b) => a.branch.code.localeCompare(b.branch.code)
      || a.designation.localeCompare(b.designation, 'ja', { numeric: true })),
  [favorites, dataReady])

  const items = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return allItems.filter(article => {
      if (readFilter === 'read' && !isChecked(article.id)) return false
      if (readFilter === 'unread' && isChecked(article.id)) return false
      return !needle || `${article.designation} ${article.title ?? ''}`.toLocaleLowerCase().includes(needle)
    })
  }, [allItems, query, readFilter, isChecked])

  function removeFavorite(article) {
    const index = items.findIndex(item => item.id === article.id)
    const focusId = items[index + 1]?.id ?? items[index - 1]?.id
    toggleFavorite(article.id)
    setStatus(`${article.designation}をお気に入りから解除しました。`)
    requestAnimationFrame(() => {
      const row = [...document.querySelectorAll('[data-favorite-id]')]
        .find(element => element.dataset.favoriteId === focusId)
      if (row) row.querySelector('.checklist-favorite')?.focus()
      else document.querySelector('[data-view-heading]')?.focus()
    })
  }

  return (
    <section className="tracker-page">
      <div className="tracker-page-heading">
        <h1 data-view-heading tabIndex={-1}>お気に入り</h1>
        <span className="tracker-muted">{allItems.length.toLocaleString()} 件</span>
      </div>
      <div className="tracker-filters">
        <div className="tracker-filter-tabs" role="group" aria-label="お気に入りの読了状態">
          {[['all', 'すべて'], ['unread', '未読'], ['read', '読了']].map(([key, label]) => (
            <button type="button" key={key} aria-pressed={readFilter === key} onClick={() => setReadFilter(key)}>{label}</button>
          ))}
        </div>
        <label className="tracker-search-label">
          <input
            type="search"
            aria-label="お気に入りを番号・タイトルで検索"
            placeholder="お気に入りを検索"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </label>
      </div>
      <p className="tracker-result-count" role="status">{items.length.toLocaleString()} 件を表示</p>
      <span className="sr-only" aria-live="polite">{status}</span>
      {items.length === 0 ? (
        <p className="tracker-empty">
          {allItems.length === 0
            ? 'お気に入りはまだありません。SCP一覧の星を押すと、ここに保存できます。'
            : '条件に一致するお気に入りはありません。'}
        </p>
      ) : (
        <ul className="tracker-list" aria-label="お気に入りの記事一覧">
          {items.map(article => {
            const read = isChecked(article.id)
            return (
              <li className={`checklist-row${read ? ' is-read' : ''}`} key={article.id} data-favorite-id={article.id}>
                <label className="checklist-read">
                  <input type="checkbox" checked={read} disabled={!isCatalogArticle(article.id)} onChange={() => toggle(article.id)} aria-label={`${article.designation}の読了`} />
                  <span className="sr-only">{read ? '読了' : '未読'}</span>
                </label>
                <a className="checklist-article" href={article.url} target="_blank" rel="noopener noreferrer">
                  <strong>{article.designation}</strong>
                  {article.title && <span>{article.title}</span>}
                  {read && <small className="checklist-read-status">読了</small>}
                </a>
                <button type="button" className="checklist-favorite" aria-label={`${article.designation}をお気に入りから解除`} title="お気に入りを解除" aria-pressed="true" onClick={() => removeFavorite(article)}>
                  ★
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
