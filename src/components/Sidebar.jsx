import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import { exportData, importData } from '../utils/dataBackup.js'
import { useToast } from './Toast.jsx'
import Icon from './Icon.jsx'
import { getCatalogIdsForBranch } from '../utils/catalog.js'

export default memo(function Sidebar({ selected, onSelect, countChecked, isOpen, favCount, queueCount, memoCount }) {
  const { branchCode, view, seriesId } = selected
  const fileInputRef = useRef(null)
  const sidebarRef = useRef(null)
  const isMobileViewport = useMobileViewport()
  const toast = useToast()
  const drawerIsClosed = isMobileViewport && !isOpen

  useEffect(() => {
    const sidebar = sidebarRef.current
    if (!sidebar) return undefined

    if (drawerIsClosed) sidebar.setAttribute('inert', '')
    else sidebar.removeAttribute('inert')

    return () => sidebar.removeAttribute('inert')
  }, [drawerIsClosed])

  function handleExport() {
    exportData()
    toast.success('データをエクスポートしました')
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
        window.dispatchEvent(new Event('scp:before-import'))
        importData(ev.target.result)
        // Toast can't render after reload — queue it in localStorage
        toast.pending('データをインポートしました')
        window.location.reload()
      } catch {
        toast.error('インポートに失敗しました。ファイルを確認してください。')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <nav
      id="app-sidebar"
      ref={sidebarRef}
      className={`sidebar${isOpen ? ' sidebar-open' : ''}`}
      aria-label="主要ナビゲーションと支部一覧"
      aria-hidden={drawerIsClosed ? 'true' : undefined}
    >
      <button
        type="button"
        className={`fav-nav-item${view == null && !branchCode ? ' active' : ''}`}
        aria-current={view == null && !branchCode ? 'page' : undefined}
        onClick={() => onSelect({ branchCode: null, view: null, seriesId: null })}
      >
        <span className="fav-nav-label"><Icon name="home" size={18} />ホーム</span>
      </button>
      <button
        type="button"
        className={`fav-nav-item${view === 'search' && !branchCode ? ' active' : ''}`}
        aria-current={view === 'search' && !branchCode ? 'page' : undefined}
        onClick={() => onSelect({ branchCode: null, view: 'search', seriesId: null })}
      >
        <span className="fav-nav-label"><Icon name="search" size={18} />全体検索</span>
      </button>
      <button
        type="button"
        className={`fav-nav-item${view === 'favorites' && !branchCode ? ' active' : ''}`}
        aria-current={view === 'favorites' && !branchCode ? 'page' : undefined}
        onClick={() => onSelect({ branchCode: null, view: 'favorites', seriesId: null })}
      >
        <span className="fav-nav-label"><Icon name="bookmark" size={18} />お気に入り</span>
        <span className="series-count">{favCount}</span>
      </button>
      <button
        type="button"
        className={`fav-nav-item${view === 'queue' && !branchCode ? ' active' : ''}`}
        aria-current={view === 'queue' && !branchCode ? 'page' : undefined}
        onClick={() => onSelect({ branchCode: null, view: 'queue', seriesId: null })}
      >
        <span className="fav-nav-label"><Icon name="queue" size={18} />後で読む</span>
        <span className="series-count">{queueCount}</span>
      </button>
      <button
        type="button"
        className={`fav-nav-item${view === 'memos' && !branchCode ? ' active' : ''}`}
        aria-current={view === 'memos' && !branchCode ? 'page' : undefined}
        onClick={() => onSelect({ branchCode: null, view: 'memos', seriesId: null })}
      >
        <span className="fav-nav-label"><Icon name="note" size={18} />メモ</span>
        {memoCount > 0 && <span className="series-count">{memoCount}</span>}
      </button>
      <button
        type="button"
        className={`fav-nav-item${view === 'stats' && !branchCode ? ' active' : ''}`}
        aria-current={view === 'stats' && !branchCode ? 'page' : undefined}
        onClick={() => onSelect({ branchCode: null, view: 'stats', seriesId: null })}
      >
        <span className="fav-nav-label"><Icon name="chart" size={18} />進捗</span>
      </button>
      <div className="sidebar-title" id="branch-navigation-title">全支部一覧 · ALL BRANCHES</div>
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
        <button type="button" className="backup-btn" onClick={handleExport}><Icon name="down" size={16} />エクスポート</button>
        <button type="button" className="backup-btn" onClick={handleImportClick}><Icon name="up" size={16} />インポート</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          aria-label="バックアップJSONを選択"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </nav>
  )
})

function useMobileViewport() {
  const query = '(max-width: 768px)'
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  ))

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined

    const media = window.matchMedia(query)
    const handleChange = event => setIsMobile(event.matches)
    setIsMobile(media.matches)

    if (typeof media.addEventListener === 'function') media.addEventListener('change', handleChange)
    else media.addListener(handleChange)

    return () => {
      if (typeof media.removeEventListener === 'function') media.removeEventListener('change', handleChange)
      else media.removeListener(handleChange)
    }
  }, [])

  return isMobile
}

function BranchItem({ branch, isOpen, activeSeriesId, activeView, onSelect, countChecked }) {
  const [expanded, setExpanded] = useState(isOpen)
  const allIds = getCatalogIdsForBranch(branch.code)

  useEffect(() => {
    if (isOpen) setExpanded(true)
  }, [isOpen])

  const total = allIds.length
  const done = countChecked(allIds)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const panelId = `branch-panel-${branch.code.toLowerCase()}`

  return (
    <div className="branch-item">
      <button
        type="button"
        className={`branch-header${isOpen ? ' active' : ''}`}
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={`${branch.nativeName} (${branch.code}) のシリーズ一覧を${expanded ? '閉じる' : '開く'}`}
        onClick={() => setExpanded(value => !value)}
      >
        <span className="branch-code">{branch.code}</span>
        <span className="branch-info">
          <span className="branch-name">{branch.nativeName}</span>
          <span className="branch-lang">{branch.language}</span>
        </span>
        <span className="branch-chevron" aria-hidden="true">
          <Icon name={expanded ? 'down' : 'right'} size={15} />
        </span>
      </button>

      <div
        className="branch-progress-bar"
        role="progressbar"
        aria-label={`${branch.nativeName}の読了進捗`}
        aria-valuemin="0"
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done}件 / ${total}件、${pct}%`}
      >
        <div
          className="branch-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="branch-progress-text">{done} / {total} ({pct}%)</div>

      {expanded && (
        <div className="series-list" id={panelId} role="group" aria-label={`${branch.nativeName}の一覧`}>
          {/* Hub navigation button */}
          {branch.hubs.length > 0 && (
            <button
              type="button"
              className={`series-item hub-nav-item${activeView === 'hubs' ? ' active' : ''}`}
              aria-current={activeView === 'hubs' ? 'page' : undefined}
              onClick={() => onSelect({ branchCode: branch.code, view: 'hubs', seriesId: null })}
            >
              <span className="series-label">ハブ・特殊ページ</span>
              <span className="series-count">{branch.hubs.reduce((s, c) => s + c.items.length, 0)}</span>
            </button>
          )}

          {/* Series list */}
          {branch.series.map(s =>
            s.type === 'separator' ? (
              <div key={s.id} className="series-separator" role="presentation">{s.label}</div>
            ) : (
              <button
                type="button"
                key={s.id}
                className={`series-item${activeView === 'series' && activeSeriesId === s.id ? ' active' : ''}`}
                aria-current={activeView === 'series' && activeSeriesId === s.id ? 'page' : undefined}
                onClick={() => onSelect({ branchCode: branch.code, view: 'series', seriesId: s.id })}
              >
                <span className="series-label">{s.label}</span>
                <SeriesCount branch={branch} series={s} countChecked={countChecked} />
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

function SeriesCount({ branch, series, countChecked }) {
  const ids = useMemo(
    () => series.type === 'custom'
      ? [...new Set(series.articles.filter(article => !article.predicted).map(a => a.id))]
      : generateSeriesArticles(
          branch.code,
          branch.minNumber ? Math.max(series.min, branch.minNumber) : series.min,
          Math.min(series.max, branch.activeMax),
        ).filter(article => !article.predicted).map(a => a.id),
    [branch, series]
  )
  const done = countChecked(ids)
  const complete = ids.length > 0 && done === ids.length
  return complete
    ? <span className="series-count series-count-done">完</span>
    : <span className="series-count">{done}/{ids.length}</span>
}
