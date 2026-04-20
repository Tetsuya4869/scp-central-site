import { useState, useMemo, useCallback } from 'react'
import { BRANCHES } from './data/branches.js'
import { generateSeriesArticles } from './utils/urlGenerator.js'
import { useChecklist } from './hooks/useChecklist.js'
import Sidebar from './components/Sidebar.jsx'
import ArticleList from './components/ArticleList.jsx'

export default function App() {
  const { toggle, markAll, isChecked, countChecked, totalChecked } = useChecklist()
  const [selected, setSelected] = useState({ branchCode: null, seriesId: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSelect = useCallback((sel) => {
    setSelected(sel)
    setSidebarOpen(false)
  }, [])

  const currentBranch = selected.branchCode
    ? BRANCHES.find(b => b.code === selected.branchCode)
    : null

  const currentSeries = currentBranch && selected.seriesId != null
    ? currentBranch.series.find(s => s.id === selected.seriesId)
    : null

  const grandTotal = useMemo(
    () => BRANCHES.reduce((sum, b) =>
      sum + b.series.reduce((s2, sr) => {
        const start = b.minNumber ? Math.max(sr.min, b.minNumber) : sr.min
        return s2 + (sr.max - start + 1)
      }, 0),
    0),
    []
  )

  const pct = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0

  return (
    <div className="app">
      <header className="app-header">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(v => !v)}
          aria-label="メニュー"
        >
          <span /><span /><span />
        </button>

        <h1>SCP · 読破チェックリスト</h1>

        <div className="header-stats">
          <span className="header-stat-val">{totalChecked.toLocaleString()}</span>
          <span className="header-stat-sep">/</span>
          <span className="header-stat-val">{grandTotal.toLocaleString()}</span>
          <span className="header-stat-pct">({pct}%)</span>
        </div>
      </header>

      <div className="body-wrap">
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <Sidebar
          selected={selected}
          onSelect={handleSelect}
          countChecked={countChecked}
          isOpen={sidebarOpen}
        />

        <main className="main-content">
          {currentBranch && currentSeries ? (
            <ArticleList
              key={`${selected.branchCode}-${selected.seriesId}`}
              branch={currentBranch}
              series={currentSeries}
              isChecked={isChecked}
              toggle={toggle}
              markAll={markAll}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          ) : (
            <Welcome
              onSelect={handleSelect}
              countChecked={countChecked}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function Welcome({ onSelect, countChecked, onOpenSidebar }) {
  return (
    <div className="welcome">
      <div className="welcome-logo">📋</div>
      <div className="welcome-title">SCP全支部 読破チェックリスト</div>
      <div className="welcome-sub">
        16支部・約24,000件以上の原作SCP記事を網羅。<br />
        支部・シリーズを選択してチェックを記録できます。<br />
        <span className="welcome-hint" onClick={onOpenSidebar}>≡ メニューから支部を選択</span>
      </div>

      <div className="welcome-grid">
        {BRANCHES.map(branch => {
          const allIds = branch.series.flatMap(s =>
            generateSeriesArticles(branch.code, s.min, s.max).map(a => a.id)
          )
          const total = allIds.length
          const done = countChecked(allIds)
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <button
              key={branch.code}
              className="welcome-branch-card"
              onClick={() => onSelect({ branchCode: branch.code, seriesId: branch.series[0]?.id ?? null })}
            >
              <div className="wc-code">{branch.code}</div>
              <div className="wc-name">{branch.nativeName}</div>
              <div className="wc-stats">{branch.language} · {done}/{total} ({pct}%)</div>
              <div className="wc-progress">
                <div
                  className="wc-progress-fill"
                  style={{ width: `${pct}%`, background: branch.accent }}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
