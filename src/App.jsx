import { useState, useMemo, useCallback } from 'react'
import { BRANCHES } from './data/branches.js'
import { generateSeriesArticles } from './utils/urlGenerator.js'
import { useChecklist } from './hooks/useChecklist.js'
import { useFavorites } from './hooks/useFavorites.js'
import { useMemos } from './hooks/useMemos.js'
import { useReadDates } from './hooks/useReadDates.js'
import { useIsMobile } from './hooks/useIsMobile.js'
import Sidebar from './components/Sidebar.jsx'
import ArticleList from './components/ArticleList.jsx'
import HubPage from './components/HubPage.jsx'
import FavoritesPage from './components/FavoritesPage.jsx'
import SearchPage from './components/SearchPage.jsx'
import BranchHomeScreen from './components/BranchHomeScreen.jsx'

export default function App() {
  const { toggle, markAll, isChecked, countChecked, totalChecked } = useChecklist()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { getMemo, setMemo } = useMemos()
  const { setReadDate, clearReadDate, getReadDate } = useReadDates()
  const isMobile = useIsMobile()

  const wrappedToggle = useCallback((id) => {
    const willBeChecked = !isChecked(id)
    toggle(id)
    if (willBeChecked) setReadDate(id)
    else clearReadDate(id)
  }, [toggle, isChecked, setReadDate, clearReadDate])

  const wrappedMarkAll = useCallback((ids, value) => {
    markAll(ids, value)
    if (value) ids.forEach(id => setReadDate(id))
    else ids.forEach(id => clearReadDate(id))
  }, [markAll, setReadDate, clearReadDate])

  const [selected, setSelected] = useState({ branchCode: null, view: null, seriesId: null })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSelect = useCallback((sel) => {
    setSelected(sel)
    setSidebarOpen(false)
  }, [])

  // On mobile: branch card → branch-home; on desktop: branch card → first series
  const handleBranchSelect = useCallback((branchCode) => {
    if (isMobile) {
      handleSelect({ branchCode, view: 'branch-home', seriesId: null })
    } else {
      const branch = BRANCHES.find(b => b.code === branchCode)
      handleSelect({ branchCode, view: 'series', seriesId: branch?.series[0]?.id ?? null })
    }
  }, [isMobile, handleSelect])

  const currentBranch = selected.branchCode
    ? BRANCHES.find(b => b.code === selected.branchCode)
    : null

  const currentSeries = currentBranch && selected.view === 'series' && selected.seriesId != null
    ? currentBranch.series.find(s => s.id === selected.seriesId)
    : null

  const grandTotal = useMemo(
    () => BRANCHES.reduce((sum, b) =>
      sum + b.series.reduce((s2, sr) => {
        if (sr.type === 'custom') return s2 + sr.articles.length
        const start = b.minNumber ? Math.max(sr.min, b.minNumber) : sr.min
        return s2 + (sr.max - start + 1)
      }, 0),
    0),
    []
  )

  const pct = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0

  // Back handler: from series/hubs → branch-home on mobile, else open sidebar
  const backToBranchHome = useCallback(() => {
    if (isMobile && selected.branchCode) {
      handleSelect({ branchCode: selected.branchCode, view: 'branch-home', seriesId: null })
    } else {
      setSidebarOpen(true)
    }
  }, [isMobile, selected.branchCode, handleSelect])

  function renderMain() {
    if (selected.view === 'search') {
      return (
        <SearchPage
          key="search"
          onNavigate={handleSelect}
          onOpenSidebar={() => setSidebarOpen(true)}
          isChecked={isChecked}
          isFavorite={isFavorite}
        />
      )
    }
    if (selected.view === 'favorites') {
      return (
        <FavoritesPage
          key="favorites"
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )
    }
    if (isMobile && selected.view === 'branch-home' && currentBranch) {
      return (
        <BranchHomeScreen
          key={`${selected.branchCode}-home`}
          branch={currentBranch}
          countChecked={countChecked}
          onSelectSeries={(seriesId) => handleSelect({ branchCode: selected.branchCode, view: 'series', seriesId })}
          onSelectHubs={() => handleSelect({ branchCode: selected.branchCode, view: 'hubs' })}
          onBack={() => handleSelect({ branchCode: null, view: null, seriesId: null })}
        />
      )
    }
    if (currentBranch && selected.view === 'hubs') {
      return (
        <HubPage
          key={`${selected.branchCode}-hubs`}
          branch={currentBranch}
          onOpenSidebar={backToBranchHome}
        />
      )
    }
    if (currentBranch && currentSeries) {
      return (
        <ArticleList
          key={`${selected.branchCode}-${selected.seriesId}`}
          branch={currentBranch}
          series={currentSeries}
          isChecked={isChecked}
          toggle={wrappedToggle}
          markAll={wrappedMarkAll}
          onOpenSidebar={backToBranchHome}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          getMemo={getMemo}
          setMemo={setMemo}
          getReadDate={getReadDate}
        />
      )
    }
    return (
      <Welcome
        onSelectBranch={handleBranchSelect}
        countChecked={countChecked}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    )
  }

  // Bottom tab active state
  const activeTab = (() => {
    if (selected.view === 'favorites') return 'favorites'
    if (selected.view === 'search') return 'search'
    return 'branches'
  })()

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
          favCount={favorites.size}
        />

        <main className="main-content">
          {renderMain()}
        </main>
      </div>

      {isMobile && (
        <nav className="bottom-tabs">
          <button
            className={`btab${activeTab === 'branches' ? ' active' : ''}`}
            onClick={() => handleSelect({ branchCode: null, view: null, seriesId: null })}
          >
            <span className="btab-icon">≡</span>
            <span className="btab-label">支部</span>
          </button>
          <button
            className={`btab${activeTab === 'favorites' ? ' active' : ''}`}
            onClick={() => handleSelect({ branchCode: null, view: 'favorites', seriesId: null })}
          >
            <span className="btab-icon">⭐</span>
            <span className="btab-label">お気に入り</span>
          </button>
          <button
            className={`btab${activeTab === 'search' ? ' active' : ''}`}
            onClick={() => handleSelect({ branchCode: null, view: 'search', seriesId: null })}
          >
            <span className="btab-icon">🔍</span>
            <span className="btab-label">検索</span>
          </button>
        </nav>
      )}
    </div>
  )
}

function Welcome({ onSelectBranch, countChecked, onOpenSidebar }) {
  return (
    <div className="welcome">
      <div className="welcome-logo">📋</div>
      <div className="welcome-title">SCP全支部 読破チェックリスト</div>
      <div className="welcome-sub">
        16支部・SCP記事・依談・ハブを網羅。<br />
        支部を選んでSCP番号一覧またはハブページへ。<br />
        <span className="welcome-hint" onClick={onOpenSidebar}>≡ メニューから支部を選択</span>
      </div>

      <div className="welcome-grid">
        {BRANCHES.map(branch => {
          const allIds = branch.series.flatMap(s =>
            s.type === 'custom'
              ? s.articles.map(a => a.id)
              : generateSeriesArticles(branch.code, s.min, s.max).map(a => a.id)
          )
          const total = allIds.length
          const done = countChecked(allIds)
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <button
              key={branch.code}
              className="welcome-branch-card"
              onClick={() => onSelectBranch(branch.code)}
            >
              <div className="wc-code">{branch.code}</div>
              <div className="wc-name">{branch.nativeName}</div>
              <div className="wc-stats">{branch.language} · {done}/{total} ({pct}%)</div>
              <div className="wc-progress">
                <div className="wc-progress-fill" style={{ width: `${pct}%`, background: branch.accent }} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
