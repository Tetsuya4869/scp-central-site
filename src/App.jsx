import { useState, useMemo, useCallback } from 'react'
import { BRANCHES } from './data/branches.js'
import { generateSeriesArticles } from './utils/urlGenerator.js'
import { useChecklist } from './hooks/useChecklist.js'
import Sidebar from './components/Sidebar.jsx'
import ArticleList from './components/ArticleList.jsx'

export default function App() {
  const { toggle, markAll, isChecked, countChecked, totalChecked } = useChecklist()
  const [selected, setSelected] = useState({ branchCode: null, seriesId: null })

  const handleSelect = useCallback((sel) => {
    setSelected(sel)
  }, [])

  const currentBranch = selected.branchCode
    ? BRANCHES.find(b => b.code === selected.branchCode)
    : null

  const currentSeries = currentBranch && selected.seriesId != null
    ? currentBranch.series.find(s => s.id === selected.seriesId)
    : null

  // Total articles across all branches (for header stats)
  const grandTotal = useMemo(
    () => BRANCHES.reduce((sum, b) =>
      sum + b.series.reduce((s2, sr) => {
        const start = b.minNumber ? Math.max(sr.min, b.minNumber) : sr.min
        return s2 + (sr.max - start + 1)
      }, 0),
    0),
    []
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>SCP Foundation · 全支部読破チェックリスト</h1>
        <span className="header-stamp">DOCUMENT CLASS: READING LOG</span>
        <div className="header-stats">
          <span>
            総読了: <span className="header-stat-val">{totalChecked.toLocaleString()}</span>
          </span>
          <span>
            / <span className="header-stat-val">{grandTotal.toLocaleString()}</span> 件
          </span>
          <span>
            達成率:{' '}
            <span className="header-stat-val">
              {grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0}%
            </span>
          </span>
        </div>
      </header>

      <div className="body-wrap">
        <Sidebar
          selected={selected}
          onSelect={handleSelect}
          countChecked={countChecked}
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
            />
          ) : (
            <Welcome onSelect={handleSelect} countChecked={countChecked} totalChecked={totalChecked} />
          )}
        </main>
      </div>
    </div>
  )
}

function Welcome({ onSelect, countChecked, totalChecked }) {
  return (
    <div className="welcome">
      <div className="welcome-logo">📋</div>
      <div className="welcome-title">SCP全支部 読破チェックリスト</div>
      <div className="welcome-sub">
        16支部・約24,000件以上の原作SCP記事を網羅。<br />
        左のサイドバーから支部・シリーズを選択してください。<br />
        チェック状態はブラウザのローカルストレージに自動保存されます。
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
