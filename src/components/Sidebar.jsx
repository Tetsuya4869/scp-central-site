import { useMemo, useRef } from 'react'
import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import { exportData, importData } from '../utils/dataBackup.js'

export default function Sidebar({ selected, onSelect, countChecked, isOpen, favCount }) {
  const { branchCode, view, seriesId } = selected
  const fileInputRef = useRef(null)

  function handleExport() {
    exportData()
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        importData(ev.target.result)
        window.location.reload()
      } catch {
        alert('インポートに失敗しました。ファイルを確認してください。')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <nav className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div
        className={`fav-nav-item${view === 'search' && !branchCode ? ' active' : ''}`}
        onClick={() => onSelect({ branchCode: null, view: 'search', seriesId: null })}
      >
        <span className="fav-nav-label">🔍 全体検索</span>
      </div>
      <div
        className={`fav-nav-item${view === 'favorites' && !branchCode ? ' active' : ''}`}
        onClick={() => onSelect({ branchCode: null, view: 'favorites', seriesId: null })}
      >
        <span className="fav-nav-label">⭐ お気に入り</span>
        <span className="series-count">{favCount}</span>
      </div>
      <div className="sidebar-title">全支部一覧 · ALL BRANCHES</div>
      {BRANCHES.map(branch => (
        <BranchItem
          key={branch.code}
          branch={branch}
          isOpen={branchCode === branch.code}
          activeSeriesId={branchCode === branch.code ? seriesId : null}
          activeView={branchCode === branch.code ? view : null}
          onSelect={onSelect}
          countChecked={countChecked}
        />
      ))}

      <div className="backup-section">
        <div className="backup-title">データ管理</div>
        <button className="backup-btn" onClick={handleExport}>📤 エクスポート</button>
        <button className="backup-btn" onClick={handleImportClick}>📥 インポート</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </nav>
  )
}

function BranchItem({ branch, isOpen, activeSeriesId, activeView, onSelect, countChecked }) {
  const allIds = useMemo(
    () => branch.series.flatMap(s =>
      s.type === 'custom'
        ? s.articles.map(a => a.id)
        : generateSeriesArticles(branch.code, s.min, s.max).map(a => a.id)
    ),
    [branch.code]
  )

  const total = allIds.length
  const done = countChecked(allIds)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function handleClick() {
    if (!isOpen) {
      onSelect({ branchCode: branch.code, view: 'series', seriesId: branch.series[0]?.id ?? null })
    } else {
      onSelect({ branchCode: null, view: null, seriesId: null })
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
          {/* Hub navigation button */}
          {branch.hubs.length > 0 && (
            <div
              className={`series-item hub-nav-item${activeView === 'hubs' ? ' active' : ''}`}
              onClick={() => onSelect({ branchCode: branch.code, view: 'hubs', seriesId: null })}
            >
              <span className="series-label">📂 ハブ・特殊ページ</span>
              <span className="series-count">{branch.hubs.reduce((s, c) => s + c.items.length, 0)}</span>
            </div>
          )}

          {/* Series list */}
          {branch.series.map(s => (
            <div
              key={s.id}
              className={`series-item${activeView === 'series' && activeSeriesId === s.id ? ' active' : ''}`}
              onClick={() => onSelect({ branchCode: branch.code, view: 'series', seriesId: s.id })}
            >
              <span className="series-label">{s.label}</span>
              <SeriesCount branch={branch} series={s} countChecked={countChecked} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SeriesCount({ branch, series, countChecked }) {
  const ids = useMemo(
    () => series.type === 'custom'
      ? series.articles.map(a => a.id)
      : generateSeriesArticles(branch.code, series.min, series.max).map(a => a.id),
    [branch.code, series]
  )
  const done = countChecked(ids)
  return (
    <span className="series-count">{done}/{ids.length}</span>
  )
}
