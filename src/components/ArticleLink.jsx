import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { resolveArticleDestinations } from '../utils/articleDestinations.js'

const ArticleLinksContext = createContext(null)
const DIALOG_ID = 'article-link-dialog'

function plainLeftClick(event) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

function secureRel(rel) {
  return [...new Set(`${rel ?? ''} noopener noreferrer`.trim().split(/\s+/))].join(' ')
}

/** One dialog for the entire app, with a stable context for large article lists. */
export function ArticleLinksProvider({ onArticleOpen, children }) {
  const [selection, setSelection] = useState(null)
  const onOpenRef = useRef(onArticleOpen)
  const dialogRef = useRef(null)
  const titleRef = useRef(null)
  const triggerRef = useRef(null)
  const focusFrameRef = useRef(null)
  onOpenRef.current = onArticleOpen

  const notifyOpen = useCallback(article => onOpenRef.current?.(article), [])
  const openChoice = useCallback((article, destinations, trigger) => {
    if (focusFrameRef.current != null) cancelAnimationFrame(focusFrameRef.current)
    triggerRef.current = trigger
    setSelection({ article, destinations })
  }, [])
  const context = useMemo(() => ({ notifyOpen, openChoice }), [notifyOpen, openChoice])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!selection || !dialog) return
    if (!dialog.open) dialog.showModal()
    titleRef.current?.focus({ preventScroll: true })
  }, [selection])

  useEffect(() => () => {
    if (focusFrameRef.current != null) cancelAnimationFrame(focusFrameRef.current)
  }, [])

  function restoreFocus() {
    if (focusFrameRef.current != null) cancelAnimationFrame(focusFrameRef.current)
    focusFrameRef.current = requestAnimationFrame(() => {
      if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true })
    })
  }

  function chooseDestination(event) {
    if (event.defaultPrevented || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return
    notifyOpen(selection.article)
    // Keep the actual anchor in the DOM while its native default action runs.
    // Closing a native dialog never needs a synthetic window.open().
    dialogRef.current?.close()
  }

  return (
    <ArticleLinksContext.Provider value={context}>
      {children}
      <dialog id={DIALOG_ID} className="article-link-dialog" ref={dialogRef} aria-labelledby="article-link-dialog-title" aria-describedby="article-link-dialog-note" onClose={restoreFocus}>
        {selection && <>
          <div className="article-link-dialog-header">
            <h2 id="article-link-dialog-title" ref={titleRef} tabIndex={-1}>{selection.article.designation}を開く</h2>
            <button type="button" aria-label="リンクの選択を閉じる" onClick={() => dialogRef.current?.close()}>閉じる</button>
          </div>
          {selection.article.title && <p>{selection.article.title}</p>}
          <p id="article-link-dialog-note" className="article-link-dialog-note">日本語版・原文とも公開状況は未確認です。</p>
          <div className="article-link-dialog-choices">
            <a href={selection.destinations.primaryUrl} target="_blank" rel="noopener noreferrer" onClick={chooseDestination} onAuxClick={chooseDestination}>日本語版を開く</a>
            <a href={selection.destinations.originalUrl} target="_blank" rel="noopener noreferrer" onClick={chooseDestination} onAuxClick={chooseDestination}>原文を開く</a>
          </div>
        </>}
      </dialog>
    </ArticleLinksContext.Provider>
  )
}

export default function ArticleLink({ article, className, children, href, target = '_blank', rel, onClick, onAuxClick, ...anchorProps }) {
  const context = useContext(ArticleLinksContext)
  const destinations = useMemo(
    () => resolveArticleDestinations(href == null ? article : { ...article, url: href }),
    [article, href],
  )
  const hasChoice = Boolean(context && destinations.offersChoice)

  function handleClick(event) {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (!destinations.primaryUrl) { event.preventDefault(); return }
    if (event.button !== 0) return
    if (hasChoice && plainLeftClick(event)) {
      event.preventDefault()
      context.openChoice(article, destinations, event.currentTarget)
      return
    }
    context?.notifyOpen(article)
  }

  function handleAuxClick(event) {
    onAuxClick?.(event)
    if (!event.defaultPrevented && event.button === 1 && destinations.primaryUrl) context?.notifyOpen(article)
  }

  return (
    <a {...anchorProps} className={className} href={destinations.primaryUrl ?? undefined} target={target} rel={secureRel(rel)} aria-disabled={!destinations.primaryUrl || undefined} aria-haspopup={hasChoice ? 'dialog' : undefined} aria-controls={hasChoice ? DIALOG_ID : undefined} onClick={handleClick} onAuxClick={handleAuxClick}>
      {children}
      {hasChoice && <small className="article-link-language-hint">日本語版・原文</small>}
    </a>
  )
}
