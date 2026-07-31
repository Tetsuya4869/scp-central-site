import { useState, useMemo } from 'react'
import { lookupArticle } from '../utils/lookupArticle.js'
import { useDataReady } from '../data/dataStore.js'
import Icon from './Icon.jsx'

export default function MemoSearchPage({ memos, onNavigate, onOpenSidebar }) {
  const [query, setQuery] = useState('')
  const dataReady = useDataReady()

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = []
    for (const [id, text] of memos.entries()) {
      if (q && !text.toLowerCase().includes(q)) continue
      const article = lookupArticle(id)
      if (article) result.push({ article, text })
    }
    result.sort((a, b) => a.article.designation.localeCompare(b.article.designation))
    return result
  }, [memos, query, dataReady])

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニューを開く">
            <Icon name="menu" />
          </button>
          <h1 className="toolbar-title" data-view-heading tabIndex={-1}>
            <Icon name="note" />
            <span>メモ一覧</span>
          </h1>
          <div className="toolbar-spacer" />
          <span className="progress-text toolbar-count">{items.length} 件</span>
        </div>
        <div className="toolbar-row toolbar-row-bottom">
          <input
            className="search-input"
            type="search"
            placeholder="メモ内容で絞り込み…"
            aria-label="メモ内容で絞り込み"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            data-route-autofocus
          />
        </div>
      </div>

      <div className="memo-search-page">
        {memos.size === 0 && (
          <p className="hub-empty">メモはまだありません。<br />記事一覧の「メモ」ボタンで追加できます。</p>
        )}
        {memos.size > 0 && items.length === 0 && (
          <p className="hub-empty">「{query}」に一致するメモはありません</p>
        )}

        {items.map(({ article, text }) => (
          <button
            type="button"
            key={article.id}
            className="memo-search-row"
            onClick={() => onNavigate({
              branchCode: article.branch.code,
              view: 'series',
              seriesId: article.seriesId,
              targetId: article.id,
            })}
          >
            <span className="memo-search-badge">
              {article.branch.code}
            </span>
            <span className="memo-search-info">
              <span className="memo-search-desg">{article.designation}</span>
              {article.title && <span className="memo-search-title">{article.title}</span>}
              <span className="memo-search-text">{text}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  )
}
