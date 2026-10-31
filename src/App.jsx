import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { BRANCHES } from './data/branches.js'
import { retryDataLoad, useDataStatus } from './data/dataStore.js'
import { parseHash, buildHash } from './utils/routing.js'
import { CATALOG_IDS, CATALOG_SIZE, isCatalogArticle } from './utils/catalog.js'
import { exportData, importData } from './utils/dataBackup.js'
import { useChecklist } from './hooks/useChecklist.js'
import { useFavorites } from './hooks/useFavorites.js'
import { useMemos } from './hooks/useMemos.js'
import { useReadDates } from './hooks/useReadDates.js'
import { useQueue } from './hooks/useQueue.js'
import ArticleList from './components/ArticleList.jsx'
import FavoritesPage from './components/FavoritesPage.jsx'
import ProgressPage from './components/ProgressPage.jsx'
import SearchPage from './components/SearchPage.jsx'
import QueuePage from './components/QueuePage.jsx'
import MemoSearchPage from './components/MemoSearchPage.jsx'
import HubPage from './components/HubPage.jsx'
import { ToastProvider, useToast } from './components/Toast.jsx'
import Icon from './components/Icon.jsx'

const FIRST_LIST = { branchCode: 'JP', view: 'series', seriesId: 1, targetId: null }

function normalizeSelection(selection) {
  // Validate saved routes as well as URL routes; keep article targets from search.
  const parsed = parseHash(buildHash(selection ?? {}))
  return parsed.view ? { ...parsed, targetId: selection?.targetId ?? null } : FIRST_LIST
}

function initialSelection() {
  if (window.location.hash && window.location.hash !== '#/') {
    return normalizeSelection(parseHash(window.location.hash))
  }
  try {
    return normalizeSelection(JSON.parse(localStorage.getItem('scp-last-view')))
  } catch {
    return FIRST_LIST
  }
}

function seriesLabel(series) {
  return series.type === 'custom'
    ? series.label
    : `${String(series.min).padStart(3, '0')}〜${series.max}`
}

export default function App() {
  return <ToastProvider><ChecklistApp /></ToastProvider>
}

function ChecklistApp() {
  const { checked, toggle, isChecked } = useChecklist()
  const { favorites, toggleFavorite, isFavorite } = useFavorites()
  const { getMemo, setMemo, memos } = useMemos()
  const { setReadDate, clearReadDate, getReadDate } = useReadDates()
  const { queue, removeFromQueue, moveUp, moveDown } = useQueue()
  const dataStatus = useDataStatus()
  const [selected, setSelected] = useState(initialSelection)
  const [lastList, setLastList] = useState(() => selected.view === 'series' ? selected : FIRST_LIST)
  const moreRef = useRef(null)
  const branchRef = useRef(null)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('scp-theme') === 'light' ? 'light' : 'dark' }
    catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('scp-theme', theme) } catch {}
    document.getElementById('app-theme-color')?.setAttribute('content', theme === 'light' ? '#faf8f4' : '#0b0c0e')
  }, [theme])

  useEffect(() => {
    const syncTheme = event => {
      if (event.key === 'scp-theme' && ['dark', 'light'].includes(event.newValue)) setTheme(event.newValue)
    }
    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  const handleSelect = useCallback(selection => {
    const next = normalizeSelection(selection)
    setSelected(next)
    if (next.view === 'series') setLastList(next)
    if (moreRef.current) moreRef.current.open = false
    const hash = buildHash(next)
    if (window.location.hash !== hash) window.location.hash = hash
    try { localStorage.setItem('scp-last-view', JSON.stringify({ ...next, targetId: null })) } catch {}
  }, [])

  useEffect(() => {
    history.replaceState(null, '', buildHash(selected))
    const syncRoute = () => {
      const next = normalizeSelection(parseHash(window.location.hash))
      setSelected(current => buildHash(current) === buildHash(next) ? current : next)
      if (next.view === 'series') setLastList(next)
      if (moreRef.current) moreRef.current.open = false
      try { localStorage.setItem('scp-last-view', JSON.stringify({ ...next, targetId: null })) } catch {}
    }
    window.addEventListener('hashchange', syncRoute)
    return () => window.removeEventListener('hashchange', syncRoute)
  }, [])

  const toggleRead = useCallback(id => {
    if (!isCatalogArticle(id)) return
    if (toggle(id)) setReadDate(id)
    else clearReadDate(id)
  }, [toggle, setReadDate, clearReadDate])

  const countChecked = useCallback(ids => [...new Set(ids)].reduce(
    (count, id) => count + (CATALOG_IDS.has(id) && checked.has(id) ? 1 : 0), 0,
  ), [checked])
  const totalChecked = useMemo(() => countChecked(CATALOG_IDS), [countChecked])
  const pct = CATALOG_SIZE ? totalChecked / CATALOG_SIZE * 100 : 0
  const progressText = pct > 0 && pct < 0.1 ? '0.1%未満' : `${Math.round(pct * 10) / 10}%`
  const currentBranch = BRANCHES.find(branch => branch.code === selected.branchCode)
  const currentSeries = currentBranch?.series.find(series => series.id === selected.seriesId)
  const browseBranch = currentBranch ?? BRANCHES.find(branch => branch.code === lastList.branchCode)
  const pageLabel = selected.view === 'series'
    ? `${currentBranch.code} ${seriesLabel(currentSeries)}`
    : ({ favorites: 'お気に入り', stats: '進捗', search: '総合検索', queue: '後で読む', memos: 'メモ', hubs: 'ハブ・特殊ページ' }[selected.view] ?? 'SCP一覧')
  const routeKey = `${buildHash(selected)}:${selected.targetId ?? ''}`

  useEffect(() => {
    document.title = `${pageLabel} · SCP 読了チェックリスト`
    window.scrollTo(0, 0)
    const frame = requestAnimationFrame(() => {
      if (selected.targetId) return
      const focusTarget = document.querySelector('[data-route-autofocus]') ?? document.querySelector('[data-view-heading]')
      focusTarget?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [routeKey, pageLabel])

  const selectGlobal = view => handleSelect({ view })
  const openBranches = () => {
    handleSelect(lastList)
    requestAnimationFrame(() => branchRef.current?.focus())
  }

  function renderPage() {
    if (selected.view === 'favorites') return <FavoritesPage favorites={favorites} toggleFavorite={toggleFavorite} isChecked={isChecked} toggle={toggleRead} />
    if (selected.view === 'stats') return <ProgressPage totalChecked={totalChecked} grandTotal={CATALOG_SIZE} countChecked={countChecked} onNavigate={handleSelect} />
    if (selected.view === 'search') return <SearchPage onNavigate={handleSelect} isChecked={isChecked} isFavorite={isFavorite} toggle={toggleRead} toggleFavorite={toggleFavorite} />
    if (selected.view === 'queue') return <QueuePage queue={queue} removeFromQueue={removeFromQueue} moveUp={moveUp} moveDown={moveDown} onOpenSidebar={openBranches} isChecked={isChecked} />
    if (selected.view === 'memos') return <MemoSearchPage memos={memos} onNavigate={handleSelect} onOpenSidebar={openBranches} />
    if (selected.view === 'hubs') return <HubPage branch={currentBranch} onNavigate={handleSelect} onOpenSidebar={openBranches} />
    return <ArticleList key={`${currentBranch.code}-${currentSeries.id}`} branch={currentBranch} series={currentSeries} isChecked={isChecked} toggle={toggleRead} isFavorite={isFavorite} toggleFavorite={toggleFavorite} getMemo={getMemo} setMemo={setMemo} getReadDate={getReadDate} targetId={selected.targetId} />
  }

  return (
    <div className="tracker-app">
      <a className="skip-link" href="#main" onClick={event => {
        event.preventDefault()
        const main = document.getElementById('main')
        main?.focus({ preventScroll: true })
        main?.scrollIntoView({ block: 'start' })
      }}>本文へ移動</a>
      <header className="tracker-header">
        <button className="tracker-brand" onClick={() => handleSelect(lastList)}>SCP <span>読了チェックリスト</span></button>
        <div className="tracker-header-actions">
          <button className="tracker-theme" onClick={() => selectGlobal('search')} aria-label="総合検索を開く" title="総合検索">
            <Icon name="search" size={18} />
          </button>
          <button className="tracker-theme" onClick={() => setTheme(value => value === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </div>
      </header>
      <div className="tracker-overall" aria-label={`全体の読了 ${totalChecked} / ${CATALOG_SIZE}件、${progressText}`}>
        <span>全体の読了</span>
        <strong>{totalChecked.toLocaleString()} <small>/ {CATALOG_SIZE.toLocaleString()} 件</small></strong>
        <progress max={CATALOG_SIZE} value={totalChecked} aria-label="全体の読了進捗" />
        <span>{progressText}</span>
      </div>
      <nav className="tracker-nav" aria-label="メインメニュー">
        {[
          { view: 'series', label: 'SCP一覧' },
          { view: 'stats', label: '進捗' },
          { view: 'favorites', label: `お気に入り (${favorites.size})` },
        ].map(item => <button key={item.view} aria-current={selected.view === item.view ? 'page' : undefined} onClick={() => item.view === 'series' ? handleSelect(lastList) : selectGlobal(item.view)}>{item.label}</button>)}
        <details ref={moreRef} className="tracker-more" onKeyDown={event => {
          if (event.key === 'Escape') { moreRef.current.open = false; moreRef.current.querySelector('summary').focus() }
        }}>
          <summary>その他</summary>
          <div className="tracker-more-panel">
            <button onClick={() => selectGlobal('search')}>総合検索</button>
            <button onClick={() => selectGlobal('queue')}>後で読む ({queue.length})</button>
            <button onClick={() => selectGlobal('memos')}>メモ ({memos.size})</button>
            <button onClick={() => handleSelect({ branchCode: browseBranch.code, view: 'hubs' })}>ハブ・特殊ページ</button>
            <DataManagement />
          </div>
        </details>
      </nav>
      {dataStatus.error && <div className="tracker-data-error" role="alert">
        <span>記事の詳細を読み込めませんでした。読了・お気に入りは引き続き記録できます。</span>
        <button disabled={dataStatus.loading} onClick={() => retryDataLoad()}>{dataStatus.loading ? '読込中…' : '再読み込み'}</button>
      </div>}
      <main className="tracker-main" id="main" tabIndex={-1}>
        {selected.view === 'series' && <div className="tracker-browse" aria-label="支部・番号帯の選択">
          <label>支部<select ref={branchRef} value={currentBranch.code} onChange={event => handleSelect({ branchCode: event.target.value, view: 'series', seriesId: BRANCHES.find(branch => branch.code === event.target.value).series.find(series => series.type !== 'separator').id })}>
            {BRANCHES.map(branch => <option key={branch.code} value={branch.code}>{branch.code} · {branch.nativeName}</option>)}
          </select></label>
          <label>番号帯・記事一覧<select value={String(currentSeries.id)} onChange={event => handleSelect({ branchCode: currentBranch.code, view: 'series', seriesId: currentBranch.series.find(series => String(series.id) === event.target.value).id })}>
            {currentBranch.series.filter(series => series.type !== 'separator').map(series => <option key={series.id} value={String(series.id)}>{seriesLabel(series)}</option>)}
          </select></label>
        </div>}
        {renderPage()}
      </main>
      <footer className="tracker-footer">記録はこのブラウザに保存されます。「その他」からバックアップできます。</footer>
    </div>
  )
}

function DataManagement() {
  const inputRef = useRef(null)
  const toast = useToast()
  async function restore(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      window.dispatchEvent(new Event('scp:before-import'))
      importData(text)
      toast.pending('データをインポートしました')
      window.location.reload()
    } catch {
      toast.error('インポートに失敗しました。ファイルを確認してください。')
    }
  }
  return <div className="tracker-backup">
    <button onClick={() => { window.dispatchEvent(new Event('scp:before-import')); exportData(); toast.success('バックアップを書き出しました') }}>バックアップを書き出す</button>
    <button onClick={() => inputRef.current?.click()}>バックアップを読み込む</button>
    <input ref={inputRef} type="file" accept=".json,application/json" aria-label="バックアップJSONを選択" hidden onChange={restore} />
  </div>
}
