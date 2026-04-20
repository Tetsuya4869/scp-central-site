import { useState, useMemo } from 'react'
import { generateSeriesArticles } from '../utils/urlGenerator.js'

const PAGE_SIZE = 100

export default function ArticleList({ branch, series, isChecked, toggle, markAll }) {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all') // 'all' | 'read' | 'unread'

  const allArticles = useMemo(
    () => generateSeriesArticles(branch.code, series.min, series.max),
    [branch.code, series.min, series.max]
  )

  const allIds = useMemo(() => allArticles.map(a => a.id), [allArticles])

  const filtered = useMemo(() => {
    if (filter === 'all') return allArticles
    if (filter === 'read') return allArticles.filter(a => isChecked(a.id))
    return allArticles.filter(a => !isChecked(a.id))
  }, [allArticles, filter, isChecked])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const readCount = useMemo(
    () => allArticles.filter(a => isChecked(a.id)).length,
    [allArticles, isChecked]
  )
  const pct = allArticles.length > 0
    ? Math.round((readCount / allArticles.length) * 100)
    : 0

  function handleFilter(f) {
    setFilter(f)
    setPage(1)
  }

  function handleMarkAll(value) {
    markAll(allIds, value)
  }

  const hubUrl = branch.domain + series.hub

  return (
    <>
      <div className="content-toolbar">
        <div>
          <span className="toolbar-title">{series.label}</span>
          <span className="toolbar-sub"> · {branch.nativeName}</span>
          <a
            className="toolbar-hub-link"
            href={hubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            [ハブ↗]
          </a>
        </div>

        <div className="toolbar-spacer" />

        <div className="series-progress">
          <div className="progress-bar-wrap">
            <div
              className="progress-bar-fill"
              style={{ width: `${pct}%`, background: branch.accent }}
            />
          </div>
          <span className="progress-text">{readCount}</span>
          <span style={{ color: 'var(--text-3)' }}>/ {allArticles.length} ({pct}%)</span>
        </div>

        <div className="filter-tabs">
          {['all', 'read', 'unread'].map(f => (
            <button
              key={f}
              className={`filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => handleFilter(f)}
            >
              {f === 'all' ? '全て' : f === 'read' ? '読了' : '未読'}
            </button>
          ))}
        </div>

        <button className="mark-btn" onClick={() => handleMarkAll(true)}>全選択</button>
        <button className="mark-btn" onClick={() => handleMarkAll(false)}>全解除</button>
      </div>

      <div className="article-list-wrap">
        <table className="article-table">
          <thead>
            <tr>
              <th className="article-td col-check">✓</th>
              <th className="article-td col-num">No.</th>
              <th className="article-td col-badges">ステータス</th>
              <th className="article-td col-link">リンク</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(article => (
              <ArticleRow
                key={article.id}
                article={article}
                read={isChecked(article.id)}
                onToggle={() => toggle(article.id)}
              />
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>
                  {filter === 'read' ? '読了記事なし' : '未読記事なし'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filtered.length}
          onPage={setPage}
        />
      )}
    </>
  )
}

function ArticleRow({ article, read, onToggle }) {
  const rowClass = [
    'article-row',
    read ? 'is-read' : '',
    article.predicted ? 'is-predicted' : '',
  ].filter(Boolean).join(' ')

  return (
    <tr className={rowClass}>
      <td className="article-td col-check">
        <input
          type="checkbox"
          className="scp-checkbox"
          checked={read}
          onChange={onToggle}
        />
      </td>
      <td className="article-td col-num">
        <span className="scp-designation">{article.designation}</span>
      </td>
      <td className="article-td col-badges">
        {article.predicted && (
          <span className="badge badge-predicted">予測URL</span>
        )}
        {read && !article.predicted && (
          <span className="badge badge-read">読了</span>
        )}
      </td>
      <td className="article-td col-link">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="article-link"
          title={article.url}
        >
          ↗
        </a>
      </td>
    </tr>
  )
}

function Pagination({ page, totalPages, total, onPage }) {
  const pages = buildPageNums(page, totalPages)

  return (
    <div className="pagination">
      <button
        className="page-btn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ◀ 前
      </button>

      <div className="page-nums">
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} style={{ padding: '2px 4px', color: 'var(--text-3)' }}>…</span>
          ) : (
            <button
              key={p}
              className={`page-num${p === page ? ' active' : ''}`}
              onClick={() => onPage(p)}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        className="page-btn"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        次 ▶
      </button>

      <span className="page-info">
        全 <span>{total}</span> 件
      </span>
    </div>
  )
}

function buildPageNums(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current])
  for (let d = -2; d <= 2; d++) {
    const p = current + d
    if (p >= 1 && p <= total) pages.add(p)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const result = []
  let prev = null
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) result.push('…')
    result.push(p)
    prev = p
  }
  return result
}
