import { useEffect, useMemo, useState } from 'react'
import { lookupArticle } from '../utils/lookupArticle.js'
import { CATALOG_IDS } from '../utils/catalog.js'
import { getCharCounts, getRatings, getTitles, useDataReady } from '../data/dataStore.js'
import Icon from './Icon.jsx'

const RANDOM_STORAGE_KEY = 'scp-random-reading-v1'
const RANDOM_COUNT = 8
const JP_BASE = 'http://scp-jp.wikidot.com/'

function loadRandomIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RANDOM_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const valid = [...new Set(parsed.filter(id => typeof id === 'string' && CATALOG_IDS.has(id)))]
    return valid.length === RANDOM_COUNT ? valid : []
  } catch {
    return []
  }
}

function sampleUnique(values, count) {
  const copy = [...values]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.max(0, count))
}

function buildRandomIds(isChecked, previous = []) {
  const all = [...CATALOG_IDS]
  if (!all.length) return []

  const unread = all.filter(id => !isChecked?.(id))
  const primary = unread.length ? unread : all
  const previousSet = new Set(previous)
  const result = sampleUnique(primary.filter(id => !previousSet.has(id)), RANDOM_COUNT)

  if (result.length < RANDOM_COUNT) {
    const resultSet = new Set(result)
    const fill = sampleUnique(primary.filter(id => !resultSet.has(id)), RANDOM_COUNT - result.length)
    result.push(...fill)
  }

  if (result.length < RANDOM_COUNT) {
    const resultSet = new Set(result)
    const fill = sampleUnique(all.filter(id => !resultSet.has(id)), RANDOM_COUNT - result.length)
    result.push(...fill)
  }

  return result
}

function getSlug(article) {
  return article.url?.startsWith(JP_BASE) ? article.url.slice(JP_BASE.length) : null
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

export default function QueuePage({ queue, removeFromQueue, moveUp, moveDown, onOpenSidebar, isChecked, onArticleOpen }) {
  const dataReady = useDataReady()
  const [reorderStatus, setReorderStatus] = useState('')
  const [mode, setMode] = useState('queue')
  const [randomStatus, setRandomStatus] = useState('')
  const [randomIds, setRandomIds] = useState(() => {
    const stored = loadRandomIds()
    return stored.length ? stored : buildRandomIds(isChecked)
  })

  const items = useMemo(
    () => queue.map(id => lookupArticle(id)).filter(Boolean),
    [queue, dataReady]
  )

  const randomItems = useMemo(
    () => randomIds.map(id => lookupArticle(id)).filter(Boolean),
    [randomIds, dataReady]
  )

  useEffect(() => {
    try { localStorage.setItem(RANDOM_STORAGE_KEY, JSON.stringify(randomIds)) } catch {}
  }, [randomIds])

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

  function refreshRandom() {
    const next = buildRandomIds(isChecked, randomIds)
    setRandomIds(next)
    setRandomStatus('ランダム候補を更新しました。')
  }

  const currentCount = mode === 'queue' ? items.length : randomItems.length

  return (
    <>
      <div className="content-toolbar read-section-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニューを開く">
            <Icon name="menu" />
          </button>
          <h1 className="toolbar-title" data-view-heading tabIndex={-1}>
            <Icon name={mode === 'queue' ? 'queue' : 'target'} />
            <span>{mode === 'queue' ? '後で読む' : 'ランダム'}</span>
          </h1>
          <div className="toolbar-spacer" />
          {mode === 'random' && (
            <button type="button" className="button button-secondary random-refresh-btn" onClick={refreshRandom}>
              <Icon name="target" size={16} />
              <span>更新</span>
            </button>
          )}
          <span className="progress-text toolbar-count">{currentCount} 件</span>
        </div>

        <div className="toolbar-row read-mode-tabs" role="tablist" aria-label="読むものの選び方">
          <button
            id="read-tab-queue"
            type="button"
            className={`read-mode-tab${mode === 'queue' ? ' active' : ''}`}
            role="tab"
            aria-selected={mode === 'queue'}
            aria-controls="read-panel-queue"
            onClick={() => setMode('queue')}
          >
            後で読む
          </button>
          <button
            id="read-tab-random"
            type="button"
            className={`read-mode-tab${mode === 'random' ? ' active' : ''}`}
            role="tab"
            aria-selected={mode === 'random'}
            aria-controls="read-panel-random"
            onClick={() => setMode('random')}
          >
            ランダム
          </button>
        </div>
      </div>

      {mode === 'queue' ? (
        <div className="queue-page" id="read-panel-queue" role="tabpanel" aria-labelledby="read-tab-queue">
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
      ) : (
        <div className="random-page" id="read-panel-random" role="tabpanel" aria-labelledby="read-tab-random">
          <p className="random-reading-note">
            未読記事から8件を抽出しています。候補は「更新」を押すまで変わりません。
          </p>
          <span className="sr-only" aria-live="polite">{randomStatus}</span>

          <div className="article-header-row random-article-header" aria-hidden="true">
            <div className="article-th col-num">候補</div>
            <div className="article-th col-badges">状態</div>
          </div>

          <div className="article-list-wrap random-article-list" role="list" aria-label="ランダムに選んだ記事">
            <div className="article-display-rows" role="presentation">
              {randomItems.map((article, idx) => {
                const read = Boolean(isChecked?.(article.id))
                const title = article.title ?? getTitles()[article.branchCode]?.[String(article.number)] ?? ''
                const charCount = getCharCount(article)
                const rating = getRating(article)
                return (
                  <div key={article.id} className="article-display-row" role="presentation">
                    <div
                      className={`article-row random-article-row${read ? ' is-read' : ''}`}
                      role="listitem"
                      aria-posinset={idx + 1}
                      aria-setsize={randomItems.length}
                    >
                      <a
                        className="article-link-zone"
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onArticleOpen?.(article, { source: 'random', position: idx })}
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
                          {read && <span className="badge badge-read">読了</span>}
                        </div>
                      </a>
                      <span className="random-open-mark" aria-hidden="true"><Icon name="external" size={16} /></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
