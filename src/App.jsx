import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { BRANCHES } from './data/branches.js'
import { generateSeriesArticles } from './utils/urlGenerator.js'
import { loadReadDates, lookupArticle } from './utils/lookupArticle.js'
import { retryDataLoad, useDataReady, useDataStatus } from './data/dataStore.js'
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
import MemoSearchPage from './components/MemoSearchPage.jsx'
import { ToastProvider } from './components/Toast.jsx'
import CommandPalette, { COMMAND_PALETTE_DIALOG_ID, COMMAND_PALETTE_TRIGGER_LABEL } from './components/CommandPalette.jsx'
import Icon from './components/Icon.jsx'
import BottomNav from './components/BottomNav.jsx'
import ReadingDock from './components/ReadingDock.jsx'
import { CATALOG_IDS, CATALOG_SIZE, getCatalogIdsForBranch, isCatalogArticle } from './utils/catalog.js'

function loadReadingSession() {
  try {
    const raw = sessionStorage.getItem('scp-active-reading')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      const id = typeof parsed === 'object' && parsed ? parsed.id : raw
      const article = lookupArticle(id)
      return article ? { article, context: parsed?.context ?? {} } : null
    } catch {
      const article = lookupArticle(raw)
      return article ? { article, context: {} } : null
    }
  } catch {
    return null
  }
}

export default function App() {
  const { checked, toggle, markAll, isChecked } = useChecklist()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { getMemo, setMemo, memos } = useMemos()
  const {
    setReadDate,
    clearReadDate,
    setReadDates,
    clearReadDates,
    getReadDate,
    dates,
  } = useReadDates()
  const { queue, removeFromQueue, toggleQueue, moveUp, moveDown, pruneQueue, isQueued } = useQueue()
  const { userRatings, setRating, getRating, hasRating } = useUserRatings()
  const { goal, setGoal } = useGoal()
  const dataReady = useDataReady()
  const dataStatus = useDataStatus()
  const dataRetryFocusedRef = useRef(false)
  const hadDataErrorRef = useRef(Boolean(dataStatus.error))

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [readingDockModalOpen, setReadingDockModalOpen] = useState(false)
  const [layoutMode, setLayoutModeRaw] = useState(() => {
    try {
      const stored = localStorage.getItem('scp-layout')
      return ['list', 'card', 'matrix'].includes(stored) ? stored : 'list'
    } catch {
      return 'list'
    }
  })
  const setLayoutMode = useCallback(m => {
    if (!['list', 'card', 'matrix'].includes(m)) return
    setLayoutModeRaw(m)
    try { localStorage.setItem('scp-layout', m) } catch {}
  }, [])

  const wrappedToggle = useCallback((id) => {
    if (!isCatalogArticle(id)) return
    const isNowChecked = toggle(id)
    if (isNowChecked) setReadDate(id)
    else clearReadDate(id)
  }, [toggle, setReadDate, clearReadDate])

  const wrappedMarkAll = useCallback((ids, value) => {
    const validIds = ids.filter(isCatalogArticle)
    markAll(validIds, value)
    if (value) setReadDates(validIds.filter(id => !isChecked(id)), Date.now())
    else clearReadDates(validIds)
  }, [markAll, setReadDates, clearReadDates, isChecked])
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('scp-theme') === 'light' ? 'light' : 'dark' }
    catch { return 'dark' }
  })
  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('scp-theme', theme) } catch {}
    const browserChrome = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-browser-chrome')
      .trim()
    if (browserChrome) document.getElementById('app-theme-color')?.setAttribute('content', browserChrome)
  }, [theme])

  useEffect(() => {
    if (hadDataErrorRef.current && !dataStatus.error && dataRetryFocusedRef.current) {
      requestAnimationFrame(() => document.querySelector('.header-command')?.focus({ preventScroll: true }))
      dataRetryFocusedRef.current = false
    }
    hadDataErrorRef.current = Boolean(dataStatus.error)
  }, [dataStatus.error])

  useEffect(() => {
    const sync = event => {
      if (event.key === 'scp-layout' && ['list', 'card', 'matrix'].includes(event.newValue)) {
        setLayoutModeRaw(event.newValue)
      }
      if (event.key === 'scp-theme' && ['dark', 'light'].includes(event.newValue)) {
        setTheme(event.newValue)
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  // Global keyboard shortcut: Ctrl/Cmd+K → command palette
  useEffect(() => {
    function onKeyDown(e) {
      // Don't hijack when composing (IME) or inside an input/textarea
      if (e.isComposing) return
      if (readingDockModalOpen) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(v => !v)
      }
      if (e.key === 'Escape') setCommandPaletteOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [readingDockModalOpen])

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
  const [sidebarFocusTarget, setSidebarFocusTarget] = useState('nav')
  const openSidebar = useCallback((target = 'nav') => {
    setSidebarFocusTarget(target === 'branches' ? 'branches' : 'nav')
    setSidebarOpen(true)
  }, [])
  const [readingSession, setReadingSession] = useState(loadReadingSession)
  const activeArticle = readingSession?.article ?? null
  const readingTriggerRef = useRef(null)

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const drawer = document.getElementById('app-sidebar')
    if (!drawer) return undefined
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const selector = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    const initialSelector = sidebarFocusTarget === 'branches' ? '.branch-header' : selector

    const mobileQuery = window.matchMedia('(max-width: 768px)')
    const backgroundElements = [
      document.querySelector('.app-header'),
      document.querySelector('.data-status-banner'),
      document.getElementById('main'),
      document.querySelector('.bottom-nav'),
      document.querySelector('.reading-dock'),
    ].filter(Boolean)
    const previousInert = new Map(backgroundElements.map(element => [element, element.hasAttribute('inert')]))
    const syncBackground = () => {
      for (const element of backgroundElements) {
        if (mobileQuery.matches) element.setAttribute('inert', '')
        else if (!previousInert.get(element)) element.removeAttribute('inert')
      }
    }
    syncBackground()
    mobileQuery.addEventListener?.('change', syncBackground)
    const focusFirst = requestAnimationFrame(() => drawer.querySelector(initialSelector)?.focus())
    const handleDrawerKeys = event => {
      if (!mobileQuery.matches) return
      if (event.key === 'Escape') {
        event.preventDefault()
        setSidebarOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...drawer.querySelectorAll(selector)].filter(element => element.getClientRects().length > 0)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleDrawerKeys)
    return () => {
      cancelAnimationFrame(focusFirst)
      document.removeEventListener('keydown', handleDrawerKeys)
      mobileQuery.removeEventListener?.('change', syncBackground)
      for (const [element, hadInert] of previousInert) {
        if (hadInert) element.setAttribute('inert', '')
        else element.removeAttribute('inert')
      }
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [sidebarOpen, sidebarFocusTarget])

  useEffect(() => {
    if (!readingDockModalOpen) return undefined
    const elements = [
      document.querySelector('.app-header'),
      document.querySelector('.body-wrap'),
      document.querySelector('.bottom-nav'),
    ].filter(Boolean)
    const previousInert = new Map(elements.map(element => [element, element.hasAttribute('inert')]))
    for (const element of elements) element.setAttribute('inert', '')
    return () => {
      for (const [element, hadInert] of previousInert) {
        if (hadInert) element.setAttribute('inert', '')
        else element.removeAttribute('inert')
      }
    }
  }, [readingDockModalOpen])

  // 初回ロードでlocalStorageから復元したとき、URLバーを実際のビューに合わせる
  useEffect(() => {
    const hash = buildHash(selected)
    if (window.location.hash !== hash) history.replaceState(null, '', hash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pruneQueue(isCatalogArticle)
  }, [pruneQueue])

  useEffect(() => {
    if (!dataReady) return
    setReadingSession(current => {
      if (!current?.article?.id) return current
      const article = lookupArticle(current.article.id)
      return article ? { ...current, article: { ...article, ...current.article } } : null
    })
  }, [dataReady])

  const handleSelect = useCallback((sel) => {
    setSelected(sel)
    const hash = buildHash(sel)
    // location.hash への代入で履歴に積む → ブラウザの戻る/進むが機能する
    if (window.location.hash !== hash) window.location.hash = hash
    try { localStorage.setItem('scp-last-view', JSON.stringify({ ...sel, targetId: null })) } catch {}
    setSidebarOpen(false)
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash(window.location.hash)
      setSelected(prev => {
        // handleSelect 由来のハッシュ変更なら state は既に正しい（targetIdを保持）
        if (buildHash(prev) === buildHash(parsed)) return prev
        try { localStorage.setItem('scp-last-view', JSON.stringify({ ...parsed, targetId: null })) } catch {}
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

  const catalogIds = CATALOG_IDS
  const grandTotal = CATALOG_SIZE
  const totalChecked = useMemo(
    () => [...checked].reduce((total, id) => total + (catalogIds.has(id) ? 1 : 0), 0),
    [checked, catalogIds]
  )
  const countChecked = useCallback(
    ids => [...new Set(ids)].reduce((total, id) => total + (catalogIds.has(id) && checked.has(id) ? 1 : 0), 0),
    [catalogIds, checked]
  )

  const pct = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0

  const handleArticleOpen = useCallback((article, context = {}) => {
    if (!article?.id) return
    const resolved = lookupArticle(article.id)
    const next = resolved ? { ...resolved, ...article } : article
    readingTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const nextSession = { article: next, context }
    setReadingSession(nextSession)
    try { sessionStorage.setItem('scp-active-reading', JSON.stringify({ id: next.id, context })) } catch {}
  }, [])

  const closeReadingDock = useCallback(() => {
    setReadingSession(null)
    try { sessionStorage.removeItem('scp-active-reading') } catch {}
    requestAnimationFrame(() => {
      if (readingTriggerRef.current?.isConnected) readingTriggerRef.current.focus({ preventScroll: true })
    })
  }, [])

  const nextArticle = useMemo(() => {
    if (!activeArticle?.id) return null
    if (readingSession?.context?.source?.includes('queue')) {
      const currentIndex = queue.indexOf(activeArticle.id)
      const nextId = queue.slice(currentIndex + 1).find(id => isCatalogArticle(id) && !isChecked(id))
      return nextId ? lookupArticle(nextId) : null
    }
    const branch = activeArticle.branch ?? BRANCHES.find(item => item.code === activeArticle.branchCode)
    const sessionSeriesId = readingSession?.context?.seriesId ?? activeArticle.seriesId
    const series = branch?.series.find(item => item.id === sessionSeriesId)
    if (!branch || !series || series.type === 'separator') return null
    const source = series.type === 'custom'
      ? series.articles
      : generateSeriesArticles(branch.code, series.min, Math.min(series.max, branch.activeMax))
    const articles = [...new Map(source.map(article => [article.id, article])).values()]
    const index = articles.findIndex(article => article.id === activeArticle.id)
    const next = index >= 0
      ? articles.slice(index + 1).find(article => !article.predicted && !isChecked(article.id))
      : null
    return next ? (lookupArticle(next.id) ?? { ...next, branch, seriesId: series.id }) : null
  }, [activeArticle, readingSession?.context, queue, isChecked])

  const openNextArticle = useCallback(() => {
    if (!nextArticle) return
    handleArticleOpen(nextArticle, readingSession?.context ?? {})
    window.open(nextArticle.url, '_blank', 'noopener,noreferrer')
  }, [nextArticle, handleArticleOpen, readingSession?.context])

  const pageLabel = currentSeries?.label
    ?? (selected.view === 'hubs' && currentBranch ? `${currentBranch.code} ハブ` : null)
    ?? ({
      search: '検索',
      favorites: 'お気に入り',
      queue: '後で読む',
      memos: 'メモ',
      stats: '進捗',
    }[selected.view] || 'ホーム')

  const routeKey = [selected.view, selected.branchCode, selected.seriesId, selected.targetId]
    .map(part => part ?? '')
    .join(':')

  useEffect(() => {
    document.title = `${pageLabel} · SCP Reading Atlas`
    const frame = requestAnimationFrame(() => {
      const preferred = document.querySelector('[data-route-autofocus]')
      if (preferred instanceof HTMLElement) preferred.focus({ preventScroll: true })
      else document.querySelector('[data-view-heading]')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [pageLabel, routeKey])

  function renderMain() {
    if (selected.view === 'memos') {
      return (
        <MemoSearchPage
          key="memos"
          memos={memos}
          onNavigate={handleSelect}
          onOpenSidebar={openSidebar}
        />
      )
    }
    if (selected.view === 'search') {
      return (
        <SearchPage
          key="search"
          onNavigate={handleSelect}
          onOpenSidebar={openSidebar}
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
          onOpenSidebar={openSidebar}
          isChecked={isChecked}
          getUserRating={getRating}
          onArticleOpen={handleArticleOpen}
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
          onOpenSidebar={openSidebar}
          isChecked={isChecked}
          onArticleOpen={handleArticleOpen}
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
          onOpenSidebar={openSidebar}
          userRatings={userRatings}
          goal={goal}
          setGoal={setGoal}
          onArticleOpen={handleArticleOpen}
          dates={dates}
        />
      )
    }
    if (currentBranch && selected.view === 'hubs') {
      return (
        <HubPage
          key={`${selected.branchCode}-hubs`}
          branch={currentBranch}
          onOpenSidebar={openSidebar}
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
          onOpenSidebar={openSidebar}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          getMemo={getMemo}
          setMemo={setMemo}
          getReadDate={getReadDate}
          layoutMode={layoutMode}
          setLayoutMode={setLayoutMode}
          isQueued={isQueued}
          addToQueue={toggleQueue}
          getUserRating={getRating}
          setUserRating={setRating}
          hasUserRating={hasRating}
          targetId={selected.targetId ?? null}
          dates={dates}
          onArticleOpen={handleArticleOpen}
        />
      )
    }
    return (
      <Welcome
        onSelect={handleSelect}
        countChecked={countChecked}
        onOpenSidebar={() => openSidebar('branches')}
        totalChecked={totalChecked}
        grandTotal={grandTotal}
        queue={queue}
        goal={goal}
        isChecked={isChecked}
        onArticleOpen={handleArticleOpen}
      />
    )
  }

  return (
    <ToastProvider>
      <a className="skip-link" href="#main">本文へ移動</a>
      <div className={`app${activeArticle ? ' app--reading' : ''}${readingDockModalOpen ? ' app--reading-modal' : ''}${dataStatus.error ? ' app--data-error' : ''}`}>
        <header className="app-header">
          <div className="app-header-brand-group">
            <button
              type="button"
              className="hamburger icon-button"
              onClick={() => sidebarOpen ? setSidebarOpen(false) : openSidebar('nav')}
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              aria-label={sidebarOpen ? '支部メニューを閉じる' : '支部メニューを開く'}
            >
              <Icon name={sidebarOpen ? 'close' : 'menu'} size={20} />
            </button>

            <button
              type="button"
              className="app-wordmark"
              onClick={() => handleSelect({ branchCode: null, view: null, seriesId: null })}
              aria-label="SCP Reading Atlas ホーム"
            >
              <span className="app-wordmark-mark" aria-hidden="true"><Icon name="target" size={21} /></span>
              <span>
                <strong>SCP</strong>
                <small>READING ATLAS</small>
              </span>
            </button>
          </div>

          <button
            type="button"
            className="header-command"
            aria-label={COMMAND_PALETTE_TRIGGER_LABEL}
            aria-controls={COMMAND_PALETTE_DIALOG_ID}
            aria-expanded={commandPaletteOpen}
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Icon name="search" size={18} />
            <span>記事・支部・操作を検索</span>
            <kbd><Icon name="command" size={13} />K</kbd>
          </button>

          <div className="header-progress" aria-label={`読了進捗 ${totalChecked} / ${grandTotal}、${pct}%`}>
            <span className="header-progress-copy">
              <small>読了</small>
              <strong>{totalChecked.toLocaleString()} <span>/ {grandTotal.toLocaleString()}</span></strong>
            </span>
            <span className="header-progress-track" aria-hidden="true">
              <span style={{ inlineSize: `${pct}%` }} />
            </span>
            <span className="header-progress-pct">{pct}%</span>
          </div>

          <button
            type="button"
            className="theme-toggle icon-button"
            onClick={toggleTheme}
            aria-label="テーマ切り替え"
            title={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={19} />
          </button>
        </header>

        {dataStatus.error && (
          <div className="data-status-banner" role="alert">
            <span>記事タイトル・文字数・評価を読み込めませんでした。基本の一覧と記録機能は利用できます。</span>
            <button
              type="button"
              onClick={() => {
                dataRetryFocusedRef.current = 'requested'
                retryDataLoad().then(success => {
                  if (success) return
                  dataRetryFocusedRef.current = true
                  requestAnimationFrame(() => document.querySelector('.data-status-banner button')?.focus())
                })
              }}
              onFocus={() => { dataRetryFocusedRef.current = true }}
              onBlur={() => {
                if (dataRetryFocusedRef.current !== 'requested') dataRetryFocusedRef.current = false
              }}
              disabled={dataStatus.loading}
            >
              {dataStatus.loading ? '再読込中…' : 'データを再読込'}
            </button>
          </div>
        )}

        <div className="body-wrap">
          {sidebarOpen && (
            <button className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-label="支部メニューを閉じる" />
          )}

          <Sidebar
            selected={selected}
            onSelect={handleSelect}
            countChecked={countChecked}
            isOpen={sidebarOpen}
            favCount={favorites.size}
            queueCount={queue.length}
            memoCount={memos.size}
          />

          <main className="main-content" id="main" tabIndex={-1}>
            <ViewWrapper viewKey={selected.view + (selected.branchCode ?? '') + (selected.seriesId ?? '')}>
              {renderMain()}
            </ViewWrapper>
          </main>
        </div>

        <ReadingDock
          article={activeArticle}
          isChecked={activeArticle ? isChecked(activeArticle.id) : false}
          onToggleRead={() => activeArticle && !activeArticle.predicted && wrappedToggle(activeArticle.id)}
          isFavorite={activeArticle ? isFavorite(activeArticle.id) : false}
          onToggleFavorite={() => activeArticle && !activeArticle.predicted && toggleFavorite(activeArticle.id)}
          isQueued={activeArticle ? isQueued(activeArticle.id) : false}
          onToggleQueue={() => {
            if (!activeArticle || activeArticle.predicted) return
            toggleQueue(activeArticle.id)
          }}
          memo={activeArticle ? getMemo(activeArticle.id) : ''}
          onMemoChange={value => activeArticle && !activeArticle.predicted && setMemo(activeArticle.id, value)}
          rating={activeArticle ? getRating(activeArticle.id) : null}
          onRatingChange={value => activeArticle && !activeArticle.predicted && setRating(activeArticle.id, value)}
          nextArticle={nextArticle}
          onOpenNext={openNextArticle}
          onClose={closeReadingDock}
          onModalChange={setReadingDockModalOpen}
        />

        <BottomNav selected={selected} onSelect={handleSelect} queueCount={queue.length} />

        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={handleSelect}
          onToggleTheme={toggleTheme}
        />
      </div>
    </ToastProvider>
  )
}

function ViewWrapper({ viewKey, children }) {
  return (
    <div key={viewKey} className="view-wrap view-visible">
      {children}
    </div>
  )
}

function Welcome({
  onSelect,
  countChecked,
  onOpenSidebar,
  totalChecked,
  grandTotal,
  queue,
  goal,
  isChecked,
  onArticleOpen,
}) {
  const dataReady = useDataReady()
  const readDates = useMemo(() => loadReadDates(), [dataReady, totalChecked])
  const recentlyRead = useMemo(() => {
    return [...readDates.entries()]
      .filter(([id]) => isCatalogArticle(id))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, ts]) => {
        const article = lookupArticle(id)
        return article ? { ...article, ts } : null
      })
      .filter(Boolean)
  }, [readDates])

  const queuedArticles = useMemo(
    () => queue
      .filter(id => isCatalogArticle(id) && !isChecked(id))
      .map(id => lookupArticle(id))
      .filter(Boolean)
      .slice(0, 4),
    [queue, dataReady, isChecked]
  )
  const continueCandidate = useMemo(() => {
    for (const recent of recentlyRead) {
      const branch = recent.branch ?? BRANCHES.find(item => item.code === recent.branchCode)
      const series = branch?.series.find(item => item.id === recent.seriesId)
      if (!branch || !series || series.type === 'separator') continue
      const source = series.type === 'custom'
        ? series.articles
        : generateSeriesArticles(branch.code, series.min, Math.min(series.max, branch.activeMax))
      const seriesArticles = [...new Map(source.map(article => [article.id, article])).values()]
      const currentIndex = seriesArticles.findIndex(article => article.id === recent.id)
      const candidate = seriesArticles.slice(currentIndex + 1)
        .find(article => !article.predicted && isCatalogArticle(article.id) && !isChecked(article.id))
      if (candidate) return lookupArticle(candidate.id) ?? { ...candidate, branch, seriesId: series.id }
    }
    return null
  }, [recentlyRead, isChecked])

  const branchCards = useMemo(() => BRANCHES.map(branch => {
    const allIds = getCatalogIdsForBranch(branch.code)
    const total = allIds.length
    const done = countChecked(allIds)
    return { branch, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }), [countChecked])

  const overallPct = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0
  const topBranch = branchCards.reduce((best, card) => card.pct > best.pct ? card : best, branchCards[0])
  const thisMonthCount = useMemo(() => {
    const now = new Date()
    let count = 0
    for (const [id, timestamp] of readDates) {
      if (!isCatalogArticle(id)) continue
      const date = new Date(timestamp)
      if (date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()) count++
    }
    return count
  }, [readDates])
  const nextUp = queuedArticles[0] ?? continueCandidate
  const nextUpIsQueued = Boolean(queuedArticles[0])
  const nextUpSource = nextUpIsQueued ? '読むキューの先頭' : '前回読んだシリーズの続き'

  return (
    <div className="welcome home-page">
      <section className="home-lead" aria-labelledby="home-heading">
        <div className="home-lead-copy">
          <p className="home-kicker">16 BRANCHES · ONE READING TRAIL</p>
          <h1 id="home-heading" data-view-heading tabIndex={-1}>次の一篇を、<br />迷わず読む。</h1>
          <p className="home-lede">
            SCP、Tale、ハブを支部横断で探し、外部Wikiへ移動したあとも読了・評価・メモをひとつの流れで残せます。
          </p>
          <div className="home-actions">
            <button className="button button-primary" onClick={() => onSelect({ branchCode: null, view: 'search', seriesId: null })}>
              <Icon name="search" size={17} /> 記事を探す
            </button>
            <button className="button button-secondary" onClick={onOpenSidebar}>
              <Icon name="branches" size={17} /> 支部から選ぶ
            </button>
          </div>
        </div>

        <div className="home-progress-ledger" aria-label="読書進捗">
          <div className="home-progress-figure">
            <span>{overallPct}</span><small>%</small>
          </div>
          <div className="home-meter" role="progressbar" aria-label="全体の読了率" aria-valuemin="0" aria-valuemax="100" aria-valuenow={overallPct}>
            <span style={{ inlineSize: `${overallPct}%` }} />
          </div>
          <dl className="home-progress-meta">
            <div><dt>読了</dt><dd>{totalChecked.toLocaleString()}</dd></div>
            <div><dt>対象</dt><dd>{grandTotal.toLocaleString()}</dd></div>
            <div><dt>進行支部</dt><dd>{topBranch?.branch.code ?? '—'} · {topBranch?.pct ?? 0}%</dd></div>
          </dl>
          <button className="text-link" onClick={() => onSelect({ branchCode: null, view: 'stats', seriesId: null })}>
            進捗の詳細 <Icon name="arrowRight" size={16} />
          </button>
        </div>
      </section>

      <section className="home-workbench" aria-labelledby="next-heading">
        <div className="home-next">
          <div className="section-heading-stack">
            <h2 id="next-heading">次に読む</h2>
          </div>

          {nextUp ? (
            <div className="home-next-article">
              <div>
                <span className="article-designation">{nextUp.designation || nextUp.id}</span>
                <h3>{nextUp.title || 'タイトル情報を読み込み中'}</h3>
                <p>{nextUp.branch?.nativeName || nextUp.branchCode} · {nextUpSource}</p>
              </div>
              <a
                className="button button-primary"
                href={nextUp.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onArticleOpen(nextUp, {
                  source: nextUpIsQueued ? 'home-queue' : 'series',
                  branchCode: nextUp.branch?.code ?? nextUp.branchCode,
                  seriesId: nextUp.seriesId,
                })}
              >
                読み始める <Icon name="external" size={16} />
              </a>
            </div>
          ) : (
            <div className="home-next-empty">
              <p>読むキューは空です。検索結果や記事一覧の「あとで読む」から候補を集められます。</p>
              <button className="text-link" onClick={() => onSelect({ branchCode: null, view: 'search', seriesId: null })}>
                最初の記事を探す <Icon name="arrowRight" size={16} />
              </button>
            </div>
          )}

          {queuedArticles.length > 1 && (
            <ol className="home-queue-preview" aria-label="読むキューの続き">
              {queuedArticles.slice(1).map((article, index) => (
                <li key={article.id}>
                  <span>{String(index + 2).padStart(2, '0')}</span>
                  <a href={article.url} target="_blank" rel="noopener noreferrer" onClick={() => onArticleOpen(article, { source: 'home-queue' })}>
                    {article.designation || article.id}
                  </a>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside className="home-month" aria-labelledby="month-heading">
          <div className="section-heading-stack">
            <h2 id="month-heading">今月の記録</h2>
          </div>
          <div className="home-month-figure"><strong>{thisMonthCount}</strong><span>記事</span></div>
          {goal?.monthly ? (
            <>
              <p>目標 {goal.monthly} 記事まで、あと {Math.max(0, goal.monthly - thisMonthCount)} 記事。</p>
              <div className="home-meter" role="progressbar" aria-label="今月の目標進捗" aria-valuemin="0" aria-valuemax={goal.monthly} aria-valuenow={Math.min(thisMonthCount, goal.monthly)}>
                <span style={{ inlineSize: `${Math.min(100, Math.round((thisMonthCount / goal.monthly) * 100))}%` }} />
              </div>
            </>
          ) : (
            <p>目標を設定すると、読書ペースをここで追跡できます。</p>
          )}
          <button className="text-link" onClick={() => onSelect({ branchCode: null, view: 'stats', seriesId: null })}>
            {goal?.monthly ? '目標を調整' : '目標を設定'} <Icon name="arrowRight" size={16} />
          </button>
        </aside>
      </section>

      {recentlyRead.length > 0 && (
        <section className="home-recent" aria-labelledby="recent-heading">
          <div className="section-heading-row">
            <div className="section-heading-stack">
              <h2 id="recent-heading">最近読んだ記事</h2>
            </div>
            <button className="text-link" onClick={() => onSelect({ branchCode: null, view: 'stats', seriesId: null })}>履歴を見る</button>
          </div>
          <div className="home-recent-list">
            {recentlyRead.map(article => (
              <a
                key={article.id}
                className="home-recent-item"
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onArticleOpen(article, { source: 'home-recent' })}
              >
                <span className="article-designation">{article.designation}</span>
                <span className="home-recent-title">{article.title || 'タイトル未取得'}</span>
                <time dateTime={new Date(article.ts).toISOString()}>{new Date(article.ts).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}</time>
                <Icon name="external" size={16} />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="home-branches" aria-labelledby="branches-heading">
        <div className="section-heading-row">
          <div className="section-heading-stack">
            <h2 id="branches-heading">支部から辿る</h2>
          </div>
          <p>各支部の公開範囲と、あなたの読了数。</p>
        </div>
        <div className="home-branch-index">
        {branchCards.map(({ branch, done, total, pct }) => {
          const firstSeries = branch.series.find(series => series.type !== 'separator')
          return (
            <button
              key={branch.code}
              className="home-branch-row"
              onClick={() => onSelect({ branchCode: branch.code, view: 'series', seriesId: firstSeries?.id ?? null })}
            >
              <span className="home-branch-code">{branch.code}</span>
              <span className="home-branch-name"><strong>{branch.nativeName}</strong><small>{branch.language}</small></span>
              <span className="home-branch-progress" aria-hidden="true"><span style={{ inlineSize: `${pct}%` }} /></span>
              <span className="home-branch-stats">{done}/{total} <small>{pct}%</small></span>
              <Icon name="arrowRight" size={17} />
            </button>
          )
        })}
        </div>
      </section>
    </div>
  )
}
