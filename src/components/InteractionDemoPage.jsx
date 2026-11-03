import { useEffect, useReducer, useRef, useState } from 'react'
import '../styles/interaction-demo.css'
import {
  DEMO_ARTICLES, createDemoState, demoReducer,
  selectDemoArticles, getDemoProgress, getResumeArticle,
} from '../utils/readingDemo.js'

const VIEWS = [['list', '一覧'], ['favorites', 'お気に入り'], ['progress', '進捗'], ['search', '検索']]
const BRANCHES = [...new Set(DEMO_ARTICLES.map(article => article.branchCode))]
const BANDS = [...new Set(DEMO_ARTICLES.map(article => article.band))]
const articleById = id => DEMO_ARTICLES.find(article => article.id === id)

export default function InteractionDemoPage({ onNavigate }) {
  const [state, dispatch] = useReducer(demoReducer, undefined, createDemoState)
  const [announcement, setAnnouncement] = useState('チェックや星を押して、サンプルの記録を変更できます。')
  const [dialogState, setDialogState] = useState(null)
  const headingRef = useRef(null)
  const workbenchRef = useRef(null)
  const panelHeadingRef = useRef(null)
  const dialogRef = useRef(null)
  const dialogTitleRef = useRef(null)
  const returnFocusRef = useRef(null)
  const focusUndoOnCloseRef = useRef(false)
  const undoRef = useRef(null)
  const tabRefs = useRef([])
  const progress = getDemoProgress(state)
  const articles = selectDemoArticles(state)
  const resumeArticle = getResumeArticle(state)
  const dialogArticle = articleById(dialogState?.id)
  const lastChangedArticle = articleById(state.lastChange?.id)
  const viewLabel = VIEWS.find(([view]) => view === state.view)?.[1] ?? '一覧'

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!state.highlightedId || state.view !== 'list') return
    const frame = requestAnimationFrame(() => {
      const row = document.getElementById(`demo-row-${state.highlightedId}`)
      row?.querySelector('.demo-article')?.focus({ preventScroll: true })
      row?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
    return () => cancelAnimationFrame(frame)
  }, [state.highlightedId, state.view])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialogState || !dialog) return undefined
    if (!dialog.open) dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [Boolean(dialogState)])

  useEffect(() => {
    if (dialogState) dialogTitleRef.current?.focus({ preventScroll: true })
  }, [dialogState?.stage, dialogState?.id])

  function focusWorkbench(selector) {
    requestAnimationFrame(() => {
      const target = (selector && workbenchRef.current?.querySelector(selector)) ?? panelHeadingRef.current
      target?.focus({ preventScroll: true })
      workbenchRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
  }

  function setFilter(field, value) {
    dispatch({ type: 'SET_FILTER', field, value })
  }

  function selectView(view) {
    if (view === 'list' || view === 'favorites') {
      setFilter('query', '')
      setFilter('favoritesOnly', false)
      setFilter('sortBy', 'number')
    }
    if (view === 'list') {
      if (!state.branchCode) setFilter('branchCode', BRANCHES[0])
      if (!state.band) setFilter('band', BANDS[0])
    }
    dispatch({ type: 'SELECT_VIEW', view })
  }

  function showBand(branchCode, band) {
    setFilter('query', '')
    setFilter('branchCode', branchCode)
    setFilter('band', band)
    setFilter('readFilter', 'all')
    setFilter('favoritesOnly', false)
    setFilter('sortBy', 'number')
    dispatch({ type: 'SELECT_VIEW', view: 'list' })
    setAnnouncement(`${branchCode} ${band} のサンプル一覧を表示しました。`)
    focusWorkbench()
  }

  function toggleRead(article) {
    const nextRead = !state.readIds.includes(article.id)
    dispatch({ type: 'TOGGLE_READ', id: article.id })
    setAnnouncement(`${article.designation}を${nextRead ? '読了にしました' : '未読に戻しました'}。サンプルだけに反映されます。`)
    if (state.readFilter !== 'all') requestAnimationFrame(() => undoRef.current?.focus({ preventScroll: true }))
  }

  function toggleFavorite(article) {
    const nextFavorite = !state.favoriteIds.includes(article.id)
    dispatch({ type: 'TOGGLE_FAVORITE', id: article.id })
    setAnnouncement(`${article.designation}をお気に入り${nextFavorite ? 'に登録しました' : 'から解除しました'}。サンプルだけに反映されます。`)
    if (state.view === 'favorites' || state.favoritesOnly) requestAnimationFrame(() => undoRef.current?.focus({ preventScroll: true }))
  }

  function undo() {
    dispatch({ type: 'UNDO' })
    setAnnouncement('直前の読了・お気に入りの変更を元に戻しました。')
    requestAnimationFrame(() => panelHeadingRef.current?.focus({ preventScroll: true }))
  }

  function resume() {
    dispatch({ type: 'RESUME' })
    setAnnouncement(resumeArticle ? `${resumeArticle.designation}から再開できます。強調した記事名を押してみてください。` : 'サンプルはすべて読了済みです。')
    if (!resumeArticle || resumeArticle.id === state.highlightedId) {
      focusWorkbench(resumeArticle ? `[data-demo-id="${resumeArticle.id}"] .demo-article` : undefined)
    }
  }

  function openArticle(article) {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    focusUndoOnCloseRef.current = false
    setDialogState({ id: article.id, stage: 'chooser', language: null })
  }

  function previewArticle(language) {
    dispatch({ type: 'OPEN_ARTICLE', id: dialogArticle.id })
    setDialogState(current => ({ ...current, stage: 'reader', language }))
  }

  function restoreModalFocus() {
    setDialogState(null)
    requestAnimationFrame(() => {
      const target = focusUndoOnCloseRef.current && undoRef.current
        ? undoRef.current
        : returnFocusRef.current?.isConnected ? returnFocusRef.current : panelHeadingRef.current
      target?.focus({ preventScroll: true })
      focusUndoOnCloseRef.current = false
    })
  }

  function markDialogRead() {
    if (!dialogArticle || state.readIds.includes(dialogArticle.id)) return
    toggleRead(dialogArticle)
    focusUndoOnCloseRef.current = true
    setDialogState(null)
  }

  function reset() {
    setDialogState(null)
    dispatch({ type: 'RESET' })
    setAnnouncement('サンプルを初期状態に戻しました。実際の記録は変更していません。')
    focusWorkbench()
  }

  function applyPreset() {
    dispatch({ type: 'APPLY_SHORT_UNREAD' })
    setAnnouncement('未読のサンプルを文字数の少ない順に並べました。条件を保存して呼び出すこともできます。')
    focusWorkbench()
  }

  function tryUndo() {
    showBand(BRANCHES[0], BANDS[0])
    setAnnouncement('一覧の読了チェックを1件変更してから、表示される「元に戻す」を押してください。')
    focusWorkbench('.demo-read input')
  }

  function handleTabKey(event, index) {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % VIEWS.length
    if (event.key === 'ArrowLeft') next = (index + VIEWS.length - 1) % VIEWS.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = VIEWS.length - 1
    if (next == null) return
    event.preventDefault()
    selectView(VIEWS[next][0])
    tabRefs.current[next]?.focus()
  }

  function readFilterControl() {
    return <label>読了状態<select value={state.readFilter} onChange={event => setFilter('readFilter', event.target.value)}><option value="all">すべて</option><option value="unread">未読</option><option value="read">読了</option></select></label>
  }

  function renderArticleList() {
    return articles.length === 0 ? <p className="demo-empty">条件に一致するサンプルはありません。</p> : (
      <ul className="demo-list" aria-label={`${viewLabel}のサンプル記事`}>
        {articles.map(article => {
          const read = state.readIds.includes(article.id)
          const favorite = state.favoriteIds.includes(article.id)
          return <li key={article.id} id={`demo-row-${article.id}`} data-demo-id={article.id} className={`demo-row${read ? ' is-read' : ''}${state.highlightedId === article.id ? ' is-highlighted' : ''}`}>
            <label className="demo-read"><input type="checkbox" checked={read} onChange={() => toggleRead(article)} aria-label={`${article.designation}の読了（サンプル）`} /><span className="sr-only">{read ? '読了' : '未読'}</span></label>
            <button type="button" className="demo-article" onClick={() => openArticle(article)}><strong>{article.designation}</strong><span>{article.title}</span><small>{read ? '読了' : '未読'} · {article.charCount.toLocaleString()}字 · 評価 {article.rating}（サンプル）</small></button>
            <button type="button" className="demo-star" aria-label={`${article.designation}をお気に入り${favorite ? 'から解除' : 'に登録'}（サンプル）`} aria-pressed={favorite} title={favorite ? 'お気に入りを解除' : 'お気に入りに登録'} onClick={() => toggleFavorite(article)}>{favorite ? '★' : '☆'}</button>
          </li>
        })}
      </ul>
    )
  }

  function renderProgress() {
    return <div className="demo-progress-branches">
      {progress.branches.map(branch => <section key={branch.branchCode}>
        <h3>{branch.branchCode} <span>{branch.done} / {branch.total} 件 · {branch.percent}%</span></h3>
        {branch.bands.map(band => <button type="button" className="demo-progress-band" key={band.band} onClick={() => showBand(branch.branchCode, band.band)}><span>{band.band}<strong>{band.done} / {band.total} 件 · {band.percent}%</strong></span><progress value={band.done} max={band.total || 1} aria-label={`${branch.branchCode} ${band.band} のサンプル読了進捗`} /></button>)}
      </section>)}
    </div>
  }

  return (
    <section className="tracker-page demo-page">
      <div className="tracker-page-heading"><h1 ref={headingRef} data-view-heading tabIndex={-1}>画面操作イメージ</h1></div>
      <p className="demo-intro">読了・お気に入り・検索の流れと、改善候補を試せます。</p>
      <p className="demo-note">架空の記事で試せます。実際の記録は変更しません。数値・リンク状態もサンプルです。</p>


      <section className="demo-workbench" ref={workbenchRef} aria-labelledby="demo-workbench-heading">
        <div className="demo-workbench-heading"><h2 id="demo-workbench-heading">サンプル画面</h2><button type="button" onClick={reset}>サンプルをリセット</button></div>
        <div className="demo-summary"><span>サンプルの読了 <strong>{progress.done} / {progress.total} 件</strong> · {progress.percent}%</span><progress value={progress.done} max={progress.total || 1} aria-label="サンプル全体の読了進捗" /><button type="button" onClick={resume} disabled={!resumeArticle}>続きから再開<span className="demo-proposal-tag">改善候補</span></button></div>
        <div className="demo-tabs" role="tablist" aria-label="サンプル画面の切り替え">
          {VIEWS.map(([view, label], index) => <button type="button" role="tab" id={`demo-tab-${view}`} key={view} ref={element => { tabRefs.current[index] = element }} aria-selected={state.view === view} aria-controls="demo-panel" tabIndex={state.view === view ? 0 : -1} onClick={() => selectView(view)} onKeyDown={event => handleTabKey(event, index)}>{label}{view === 'favorites' ? ` (${state.favoriteIds.length})` : ''}</button>)}
        </div>
        <div className="demo-panel" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${state.view}`}>
          <h3 className="sr-only" ref={panelHeadingRef} tabIndex={-1}>{viewLabel}の操作例</h3>
          {state.view === 'list' && <div className="demo-controls"><label>支部<select value={state.branchCode} onChange={event => setFilter('branchCode', event.target.value)}>{BRANCHES.map(code => <option key={code} value={code}>{code}</option>)}</select></label><label>番号帯<select value={state.band} onChange={event => setFilter('band', event.target.value)}>{BANDS.map(band => <option key={band} value={band}>{band}</option>)}</select></label>{readFilterControl()}</div>}
          {state.view === 'favorites' && <div className="demo-controls">{readFilterControl()}<span>星で登録したサンプルを、支部をまたいで確認できます。</span></div>}
          {state.view === 'search' && <>
            <div className="demo-controls demo-search-controls">
              <label>番号・タイトル<input type="search" value={state.query} onChange={event => setFilter('query', event.target.value)} placeholder="サンプルを検索" /></label>
              <label>支部<select value={state.branchCode} onChange={event => setFilter('branchCode', event.target.value)}><option value="">すべて</option>{BRANCHES.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
              <label>番号帯<select value={state.band} onChange={event => setFilter('band', event.target.value)}><option value="">すべて</option>{BANDS.map(band => <option key={band} value={band}>{band}</option>)}</select></label>
              {readFilterControl()}
              <label>並び順<select value={state.sortBy} onChange={event => setFilter('sortBy', event.target.value)}><option value="number">番号順</option><option value="rating">評価の高い順</option><option value="short">文字数の少ない順</option></select></label>
              <label className="demo-checkbox-label"><input type="checkbox" checked={state.favoritesOnly} onChange={event => setFilter('favoritesOnly', event.target.checked)} />お気に入りのみ</label>
            </div>
            <div className="demo-search-actions"><button type="button" onClick={applyPreset}>未読を短い順に</button><button type="button" onClick={() => { dispatch({ type: 'SAVE_SEARCH' }); setAnnouncement('今の検索条件をサンプル内に保存しました。条件を変えてから呼び出せます。') }}>条件を保存</button><button type="button" disabled={!state.savedSearch} onClick={() => { dispatch({ type: 'APPLY_SAVED_SEARCH' }); setAnnouncement('保存した検索条件を呼び出しました。') }}>保存した条件を呼び出す</button></div>
            <p className="demo-feature-note">文字数は説明用の数値です。条件保存はこのページを開いている間だけ有効です。</p>
          </>}
          <div className="demo-status" role="status" aria-live="polite">{announcement}</div>
          {state.lastChange && <div className="demo-undo"><span>{lastChangedArticle?.designation}の{state.lastChange.type === 'read' ? '読了状態' : 'お気に入り'}を変更しました。</span><button type="button" ref={undoRef} onClick={undo}>元に戻す</button></div>}
          {state.view === 'progress' ? renderProgress() : <><p className="demo-result-count">{articles.length} 件のサンプル</p>{renderArticleList()}</>}
        </div>
        <p className="demo-feature-note">読了・お気に入り・進捗・検索は既存機能の操作例です。再開・元に戻す・条件保存・リンク案内は改善候補です。</p>
      </section>
      <details className="demo-instructions"><summary>試し方</summary><ol><li>「一覧」で読了チェックと星を押し、「お気に入り」「進捗」で反映を確認します。</li><li>「続きから再開」で次の未読記事を見つけ、記事名から日本語版・原文を選ぶ流れを試します。</li><li>「検索」で条件を変えて保存・呼び出しを試します。変更を間違えたら「元に戻す」で戻せます。</li></ol></details>

      <section aria-labelledby="demo-opportunities-heading">
        <h2 className="demo-section-heading" id="demo-opportunities-heading">改善候補を試す</h2>
        <ol className="demo-opportunities">
          <li><h3>① 続きから再開</h3><p>最後に開いた記事の次にある未読記事へ移動し、探し直す手間を減らします。</p><button type="button" onClick={resume} disabled={!resumeArticle}>次の未読を表示する</button></li>
          <li><h3>② 変更を元に戻す</h3><p>チェックや星を間違えて押しても、直前の変更を1回で戻せます。</p><button type="button" onClick={tryUndo}>読了チェックで試す</button></li>
          <li><h3>③ 検索条件をすぐ呼び出す</h3><p>「未読を短い順に」など、よく使う条件を保存して呼び出せます。</p><button type="button" onClick={applyPreset}>未読を短い順に探す</button></li>
          <li><h3>④ 日本語版のリンク状態を案内</h3><p>日本語版が未確認のときも、原文を選ぶ流れを記事を開く前に確認できます。</p><button type="button" onClick={() => openArticle(DEMO_ARTICLES.find(article => article.jpStatus === 'unverified') ?? DEMO_ARTICLES[0])}>リンク案内の例を見る</button></li>
        </ol>
      </section>
      <div className="demo-footer">{onNavigate && <button type="button" onClick={() => onNavigate({ branchCode: 'JP', view: 'series', seriesId: 1 })}>実際のSCP一覧へ</button>}<span>このページを離れると、サンプルの操作は初期状態に戻ります。</span></div>

      <dialog className="demo-dialog" ref={dialogRef} aria-labelledby="demo-dialog-title" onClose={restoreModalFocus}>
        {dialogArticle && <>
          <div className="demo-dialog-header"><h2 id="demo-dialog-title" ref={dialogTitleRef} tabIndex={-1}>{dialogState.stage === 'chooser' ? '読む言語を選ぶ（デモ）' : '記事を読む操作（デモ）'}</h2><button type="button" aria-label="デモ画面を閉じる" onClick={() => setDialogState(null)}>閉じる</button></div>
          <p><strong>{dialogArticle.designation}</strong> · {dialogArticle.title}</p>
          <p className="demo-link-status">{dialogArticle.jpStatus === 'available' ? '日本語版あり（サンプル）' : '日本語版未確認（サンプル）'}<small>サンプル判定・実URL未確認</small></p>
          {dialogState.stage === 'chooser' ? <>
            <p>外部サイトは開きません。ボタンを押すと、読む画面の操作例を表示します。</p>
            <div className="demo-dialog-actions">{dialogArticle.jpStatus === 'available' && <button type="button" onClick={() => previewArticle('jp')}>日本語版を開く（デモ）</button>}<button type="button" onClick={() => previewArticle('original')}>原文を開く（デモ）</button></div>
          </> : <>
            <p className="demo-reader-note">{dialogState.language === 'jp' ? '日本語版' : '原文'}を選びました。ここは記事本文ではなく、読了を記録する流れを確認するための説明用画面です。</p>
            <p>読み終えたら「読了にする」を押すと、この画面が閉じてサンプルの進捗に反映されます。</p>
            <div className="demo-dialog-actions"><button type="button" disabled={state.readIds.includes(dialogArticle.id)} onClick={markDialogRead}>{state.readIds.includes(dialogArticle.id) ? '読了済み' : '読了にする'}</button><button type="button" onClick={() => setDialogState(current => ({ ...current, stage: 'chooser', language: null }))}>言語の選択に戻る</button></div>
          </>}
        </>}
      </dialog>
    </section>
  )
}
