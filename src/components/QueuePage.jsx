import { useMemo } from 'react'
import { lookupArticle } from '../utils/lookupArticle.js'
import { useDataReady } from '../data/dataStore.js'

export default function QueuePage({ queue, removeFromQueue, moveUp, moveDown, onOpenSidebar, isChecked }) {
  const dataReady = useDataReady()
  const items = useMemo(
    () => queue.map(id => lookupArticle(id)).filter(Boolean),
    [queue, dataReady]
  )

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニュー">≡</button>
          <span className="toolbar-title">📚 後で読む</span>
          <div className="toolbar-spacer" />
          <span className="progress-text" style={{ marginRight: 8 }}>{items.length} 件</span>
        </div>
      </div>

      <div className="queue-page">
        {items.length === 0 && (
          <p className="hub-empty">
            後で読むリストは空です。<br />
            記事一覧の <strong>+</strong> ボタンで追加できます。
          </p>
        )}

        {items.map((article, idx) => (
          <div key={article.id} className={`queue-row${isChecked?.(article.id) ? ' is-read' : ''}`}>
            <div className="queue-pos">
              {idx === 0
                ? <span className="badge badge-next">次</span>
                : <span className="queue-idx">{idx + 1}</span>
              }
            </div>
            <a
              className="queue-link"
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="queue-designation">{article.designation}</span>
              {article.title && <span className="queue-title">{article.title}</span>}
            </a>
            <div className="queue-actions">
              <button
                className="queue-move-btn"
                onClick={() => moveUp(article.id)}
                disabled={idx === 0}
                title="上に移動"
              >▲</button>
              <button
                className="queue-move-btn"
                onClick={() => moveDown(article.id)}
                disabled={idx === items.length - 1}
                title="下に移動"
              >▼</button>
              <button
                className="queue-remove-btn"
                onClick={() => removeFromQueue(article.id)}
                title="リストから削除"
              >×</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
