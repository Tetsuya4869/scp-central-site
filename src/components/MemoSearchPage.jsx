import { useState, useMemo } from 'react'
import { lookupArticle } from '../utils/lookupArticle.js'
import { useDataReady } from '../data/dataStore.js'

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
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニュー">≡</button>
          <span className="toolbar-title">✎ メモ一覧</span>
          <div className="toolbar-spacer" />
          <span className="progress-text" style={{ marginRight: 8 }}>{items.length} 件</span>
        </div>
        <div className="toolbar-row toolbar-row-bottom">
          <input
            className="search-input"
            type="search"
            placeholder="メモ内容で絞り込み…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="memo-search-page">
        {memos.size === 0 && (
          <p className="hub-empty">メモはまだありません。<br />記事一覧の ✎ ボタンで追加できます。</p>
        )}
        {memos.size > 0 && items.length === 0 && (
          <p className="hub-empty">「{query}」に一致するメモはありません</p>
        )}

        {items.map(({ article, text }) => (
          <div
            key={article.id}
            className="memo-search-row"
            onClick={() => onNavigate({
              branchCode: article.branch.code,
              view: 'series',
              seriesId: article.seriesId,
              targetId: article.id,
            })}
          >
            <span
              className="memo-search-badge"
              style={{ background: article.branch.accent }}
            >
              {article.branch.code}
            </span>
            <div className="memo-search-info">
              <span className="memo-search-desg">{article.designation}</span>
              {article.title && <span className="memo-search-title">{article.title}</span>}
              <span className="memo-search-text">✎ {text}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
