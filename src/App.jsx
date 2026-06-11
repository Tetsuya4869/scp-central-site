import { useState, useMemo, useCallback, useEffect } from 'react'
import { BRANCHES } from './data/branches.js'
import { generateSeriesArticles } from './utils/urlGenerator.js'
import { loadReadDates, lookupArticle } from './utils/lookupArticle.js'
import { parseHash, buildHash, DEFAULT_SELECTED } from './utils/routing.js'
import { useChecklist } from './hooks/useChecklist.js'
import { useFavorites } from './hooks/useFavorites.js'
import { useMemos } from './hooks/useMemos.js'
import { useReadDates } from './hooks/useReadDates.js'
import { useQueue } from './hooks/useQueue.js'
import { useUserRatings } from './hooks/useUserRatings.js'
import { useGoal } from './hooks/useGoal.js'
import Sidebar from './components/Sidebar.jsx'
import ArticleList from './components/ArticleList.jsx'
import HubPage from './components/HubPage.jsx'
import FavoritesPage from './components/FavoritesPage.jsx'
import SearchPage from './components/SearchPage.jsx'
import StatsPage from './components/StatsPage.jsx'
import QueuePage from './components/QueuePage.jsx'

export default function App() {
  const { toggle, markAll, isChecked, countChecked, totalChecked } = useChecklist()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { getMemo, setMemo } = useMemos()
  const { setReadDate, clearReadDate, getReadDate } = useReadDates()
  const { queue, addToQueue, removeFromQueue, moveUp, moveDown, isQueued } = useQueue()
  const { userRatings, setRating, getRating, hasRating } = useUserRatings()
  const { goal, setGoal } = useGoal()

  const [layoutMode, setLayoutModeRaw] = useState(() => localStorage.getItem('scp-layout') || 'list')
  const setLayoutMode = useCallback(m => {
    setLayoutModeRaw(m)
    localStorage.setItem('scp-layout', m)
  }, [])

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
  const [theme, setTheme] = useState(() => localStorage.getItem('scp-theme') || 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('scp-theme', theme)
  }, [theme])

  // view: null | 'series' | 'hubs' | 'search' | 'favorites' | 'stats' | 'queue'
  const [selected, setSelected] = useState(() => {
    const fromHash = parseHash(window.location.hash)
    if (fromHash.view || fromHash.branchCode) return fromHash
    try {
      const saved = localStorage.getItem('scp-last-view')
      if (saved) return { ...JSON.parse(saved), targetId: null }
    } catch {}
    return DEFAULT_SELECTED
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 初回ロードでlocalStorageから復元したとき、URLバーを実際のビューに合わせる
  useEffect(() => {
    const hash = buildHash(selected)
    if (window.location.hash !== hash) history.replaceState(null, '', hash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = useCallback((sel) => {
    setSelected(sel)
    const hash = buildHash(sel)
    // location.hash への代入で履歴に積む → ブラウザの戻る/進むが機能する
    if (window.location.hash !== hash) window.location.hash = hash
    localStorage.setItem('scp-last-view', JSON.stringify({ ...sel, targetId: null }))
    setSidebarOpen(false)
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(window.location.hash)
      setSelected(prev => {
        // handleSelect 由来のハッシュ変更なら state は既に正しい（targetIdを保持）
        if (buildHash(prev) === buildHash(parsed)) return prev
        localStorage.setItem('scp-last-view', JSON.stringify({ ...parsed, targetId: null }))
        return parsed
      })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const currentBranch = selected.branchCode
    ? BRANCHES.find(b => b.code === selected.branchCode)
    : null

  const currentSeries = currentBranch && selected.view === 'series' && selected.seriesId != null
    ? currentBranch.series.find(s => s.id === selected.seriesId)
    : null

  const grandTotal = useMemo(
    () => BRANCHES.reduce((sum, b) =>
      sum + b.series.reduce((s2, sr) => {
        if (sr.type === 'separator') return s2
        if (sr.type === 'custom') return s2 + sr.articles.length
        const start = b.minNumber ? Math.max(sr.min, b.minNumber) : sr.min
        return s2 + (sr.max - start + 1)
      }, 0),
    0),
    []
  )

  const pct = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0

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
          isChecked={isChecked}
          getUserRating={getRating}
        />
      )
    }
    if (selected.view === 'queue') {
      return (
        <QueuePage
          key="queue"
          queue={queue}
          removeFromQueue={removeFromQueue}
          moveUp={moveUp}
          moveDown={moveDown}
          onOpenSidebar={() => setSidebarOpen(true)}
          isChecked={isChecked}
        />
      )
    }
    if (selected.view === 'stats') {
      return (
        <StatsPage
          key="stats"
          totalChecked={totalChecked}
          grandTotal={grandTotal}
          countChecked={countChecked}
          onOpenSidebar={() => setSidebarOpen(true)}
          userRatings={userRatings}
          goal={goal}
          setGoal={setGoal}
        />
      )
    }
    if (currentBranch && selected.view === 'hubs') {
      return (
        <HubPage
          key={`${selected.branchCode}-hubs`}
          branch={currentBranch}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNavigate={handleSelect}
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
          onOpenSidebar={() => setSidebarOpen(true)}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          getMemo={getMemo}
          setMemo={setMemo}
          getReadDate={getReadDate}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          isQueued={isQueued}
          addToQueue={addToQueue}
          getUserRating={getRating}
          setUserRating={setRating}
          hasUserRating={hasRating}
          targetId={selected.targetId ?? null}
        />
      )
    }
    return (
      <Welcome
        onSelect={handleSelect}
        countChecked={countChecked}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
    )
  }

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

        <button
          className="theme-toggle"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          aria-label="テーマ切り替え"
          title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
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
          queueCount={queue.length}
        />

        <main className="main-content">
          <ViewWrapper viewKey={selected.view + (selected.branchCode ?? '') + (selected.seriesId ?? '')}>
            {renderMain()}
          </ViewWrapper>
        </main>
      </div>
    </div>
  )
}

function ViewWrapper({ viewKey, children }) {
  const [key, setKey] = useState(viewKey)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (viewKey === key) return
    setVisible(false)
    const t = setTimeout(() => { setKey(viewKey); setVisible(true) }, 80)
    return () => clearTimeout(t)
  }, [viewKey, key])

  return (
    <div className={`view-wrap${visible ? ' view-visible' : ' view-hidden'}`}>
      {children}
    </div>
  )
}

function Welcome({ onSelect, countChecked, onOpenSidebar }) {
  const recentlyRead = useMemo(() => {
    const map = loadReadDates()
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, ts]) => {
        const article = lookupArticle(id)
        return article ? { ...article, ts } : null
      })
      .filter(Boolean)
  }, [])

  const branchCards = useMemo(() => BRANCHES.map(branch => {
    const allIds = branch.series.flatMap(s => {
      if (s.type === 'separator') return []
      if (s.type === 'custom') return s.articles.map(a => a.id)
      return generateSeriesArticles(branch.code, s.min, s.max).map(a => a.id)
    })
    const total = allIds.length
    const done = countChecked(allIds)
    return { branch, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }), [countChecked])

  return (
    <div className="welcome">
      <div className="welcome-logo">📋</div>
      <div className="welcome-title">SCP全支部 読破チェックリスト</div>
      <div className="welcome-sub">
        16支部・SCP記事・依談・ハブを網羅。<br />
        支部を選んでSCP番号一覧またはハブページへ。<br />
        <span className="welcome-hint" onClick={onOpenSidebar}>≡ メニューから支部を選択</span>
      </div>

      {recentlyRead.length > 0 && (
        <div className="welcome-recent">
          <div className="welcome-recent-title">最近読んだ記事</div>
          <div className="welcome-recent-list">
            {recentlyRead.map(article => (
              <a
                key={article.id}
                className="welcome-recent-item"
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="welcome-recent-desg">{article.designation}</span>
                {article.title && <span className="welcome-recent-ttl">{article.title}</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="welcome-grid">
        {branchCards.map(({ branch, done, total, pct }) => {
          return (
            <button
              key={branch.code}
              className="welcome-branch-card"
              onClick={() => onSelect({ branchCode: branch.code, view: 'series', seriesId: branch.series[0]?.id ?? null })}
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
