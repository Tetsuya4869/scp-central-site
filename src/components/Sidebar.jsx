import { useMemo } from 'react'
import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'

export default function Sidebar({ selected, onSelect, countChecked, isOpen }) {
  const { branchCode, seriesId } = selected

  return (
    <nav className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-title">全支部一覧 · ALL BRANCHES</div>
      {BRANCHES.map(branch => (
        <BranchItem
          key={branch.code}
          branch={branch}
          isOpen={branchCode === branch.code}
          activeSeriesId={branchCode === branch.code ? seriesId : null}
          onSelect={onSelect}
          countChecked={countChecked}
        />
      ))}
    </nav>
  )
}

function BranchItem({ branch, isOpen, activeSeriesId, onSelect, countChecked }) {
  const allIds = useMemo(
    () => branch.series.flatMap(s =>
      generateSeriesArticles(branch.code, s.min, s.max).map(a => a.id)
    ),
    [branch.code]
  )

  const total = allIds.length
  const done = countChecked(allIds)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function handleClick() {
    if (!isOpen) {
      onSelect({ branchCode: branch.code, seriesId: branch.series[0]?.id ?? null })
    } else {
      // collapse without closing sidebar
      onSelect({ branchCode: null, seriesId: null })
    }
  }

  return (
    <div className="branch-item">
      <div
        className={`branch-header${isOpen ? ' active' : ''}`}
        onClick={handleClick}
      >
        <span className="branch-code">{branch.code}</span>
        <span className="branch-info">
          <span className="branch-name">{branch.nativeName}</span>
          <span className="branch-lang">{branch.language}</span>
        </span>
        <span className="branch-chevron">{isOpen ? '▲' : '▼'}</span>
      </div>

      <div className="branch-progress-bar">
        <div
          className="branch-progress-fill"
          style={{ width: `${pct}%`, background: branch.accent }}
        />
      </div>
      <div className="branch-progress-text">{done} / {total} ({pct}%)</div>

      {isOpen && (
        <div className="series-list">
          {branch.series.map(s => (
            <div
              key={s.id}
              className={`series-item${activeSeriesId === s.id ? ' active' : ''}`}
              onClick={() => onSelect({ branchCode: branch.code, seriesId: s.id })}
            >
              <span className="series-label">{s.label}</span>
              <SeriesCount branch={branch} series={s} countChecked={countChecked} />
            </div>
          ))}

          {branch.special.length > 0 && (
            <div className="special-section">
              <div className="special-title">特殊ページ</div>
              {branch.special.map(sp => (
                <a
                  key={sp.id}
                  href={sp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="special-item"
                >
                  <span className="special-icon">↗</span>
                  {sp.label}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SeriesCount({ branch, series, countChecked }) {
  const ids = useMemo(
    () => generateSeriesArticles(branch.code, series.min, series.max).map(a => a.id),
    [branch.code, series.min, series.max]
  )
  const done = countChecked(ids)
  return (
    <span className="series-count">{done}/{ids.length}</span>
  )
}
