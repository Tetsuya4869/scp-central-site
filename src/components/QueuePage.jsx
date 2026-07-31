import { useMemo, useState } from 'react'
import { lookupArticle } from '../utils/lookupArticle.js'
import { useDataReady } from '../data/dataStore.js'
import Icon from './Icon.jsx'

export default function QueuePage({ queue, removeFromQueue, moveUp, moveDown, onOpenSidebar, isChecked, onArticleOpen }) {
  const dataReady = useDataReady()
  const [reorderStatus, setReorderStatus] = useState('')
  const items = useMemo(
    () => queue.map(id => lookupArticle(id)).filter(Boolean),
    [queue, dataReady]
  )

  function moveArticle(article, idx, direction) {
    if (direction === 'up') moveUp(article.id)
    else moveDown(article.id)
    const nextPosition = direction === 'up' ? idx : idx + 2
    setReorderStatus(`${article.designation}を${nextPosition}番目に移動しました。`)
    requestAnimationFrame(() => {
      const row = [...document.querySelectorAll('[data-queue-id]')]
        .find(element => element.dataset.queueId === article.id)
      row?.querySelector(`[data-move="${direction}"]`)?.focus()
    })
  }

  function removeArticle(article, idx) {
    removeFromQueue(article.id)
    setReorderStatus(`${article.designation}を後で読むから削除しました。`)
    requestAnimationFrame(() => {
      const buttons = document.querySelectorAll('.queue-remove-btn')
      buttons[Math.min(idx, buttons.length - 1)]?.focus()
      if (!buttons.length) document.querySelector('[data-view-heading]')?.focus()
    })
  }

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニューを開く">
            <Icon name="menu" />
          </button>
          <h1 className="toolbar-title" data-view-heading tabIndex={-1}>
            <Icon name="queue" />
            <span>後で読む</span>
          </h1>
          <div className="toolbar-spacer" />
          <span className="progress-text toolbar-count">{items.length} 件</span>
        </div>
      </div>

      <div className="queue-page">
        {items.length === 0 && (
          <p className="hub-empty">
            後で読むリストは空です。<br />
            記事一覧の「後で読む」ボタンで追加できます。
          </p>
        )}

        <span className="sr-only" aria-live="polite">{reorderStatus}</span>
        {items.length > 0 && <ol className="queue-list">
        {items.map((article, idx) => {
          const read = Boolean(isChecked?.(article.id))
          return (
            <li
              key={article.id}
              className={`queue-row${read ? ' is-read' : ''}`}
              data-queue-id={article.id}
              aria-posinset={idx + 1}
              aria-setsize={items.length}
            >
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
                onClick={() => onArticleOpen?.(article, { source: 'queue', position: idx })}
              >
                <span className="sr-only">{read ? '読了: ' : '未読: '}</span>
                <span className="queue-designation">{article.designation}</span>
                {article.title && <span className="queue-title">{article.title}</span>}
              </a>
              <div className="queue-actions">
                <button
                  className="queue-move-btn"
                  onClick={() => moveArticle(article, idx, 'up')}
                  data-move="up"
                  disabled={idx === 0}
                  title="上に移動"
                  aria-label={`${article.designation}を上に移動`}
                >
                  <Icon name="up" size={16} />
                </button>
                <button
                  className="queue-move-btn"
                  onClick={() => moveArticle(article, idx, 'down')}
                  data-move="down"
                  disabled={idx === items.length - 1}
                  title="下に移動"
                  aria-label={`${article.designation}を下に移動`}
                >
                  <Icon name="down" size={16} />
                </button>
                <button
                  className="queue-remove-btn"
                  onClick={() => removeArticle(article, idx)}
                  title="リストから削除"
                  aria-label={`${article.designation}を後で読むから削除`}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </li>
          )
        })}
        </ol>}
      </div>
    </>
  )
}
