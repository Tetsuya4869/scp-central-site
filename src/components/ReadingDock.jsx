import { useEffect, useId, useRef, useState } from 'react'
import Icon from './Icon.jsx'

export default function ReadingDock({
  article,
  isChecked,
  onToggleRead,
  isFavorite,
  onToggleFavorite,
  isQueued,
  onToggleQueue,
  memo,
  onMemoChange,
  nextArticle,
  onOpenNext,
  onClose,
  onModalChange,
}) {
  const isPhoneAtStart = typeof window !== 'undefined' && window.matchMedia('(max-width: 48rem)').matches
  const [collapsed, setCollapsed] = useState(isPhoneAtStart)
  const [isCompact, setIsCompact] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 75rem)').matches
  ))
  const [isPhone, setIsPhone] = useState(isPhoneAtStart)
  const memoId = useId()
  const dockRef = useRef(null)
  const collapseButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => setCollapsed(isPhone), [article?.id, isPhone])

  useEffect(() => {
    const compactMedia = window.matchMedia('(max-width: 75rem)')
    const phoneMedia = window.matchMedia('(max-width: 48rem)')
    const updateCompact = event => setIsCompact(event.matches)
    const updatePhone = event => setIsPhone(event.matches)

    setIsCompact(compactMedia.matches)
    setIsPhone(phoneMedia.matches)
    compactMedia.addEventListener?.('change', updateCompact)
    phoneMedia.addEventListener?.('change', updatePhone)

    return () => {
      compactMedia.removeEventListener?.('change', updateCompact)
      phoneMedia.removeEventListener?.('change', updatePhone)
    }
  }, [])

  const isModal = Boolean(article && isCompact && !collapsed)

  useEffect(() => {
    onModalChange?.(isModal)
    return () => onModalChange?.(false)
  }, [isModal, onModalChange])

  useEffect(() => {
    if (!isModal) return undefined
    const dock = dockRef.current
    if (!dock) return undefined
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const selector = 'button:not(:disabled), a[href], textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    const frame = requestAnimationFrame(() => collapseButtonRef.current?.focus({ preventScroll: true }))
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setCollapsed(true)
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...dock.querySelectorAll(selector)].filter(element => element.getClientRects().length > 0)
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
    dock.addEventListener('keydown', handleKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      dock.removeEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        if (collapseButtonRef.current?.isConnected) collapseButtonRef.current.focus({ preventScroll: true })
        else if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus({ preventScroll: true })
      })
    }
  }, [isModal])

  if (!article) return null

  const designation = article.designation || article.id
  const branchCode = article.branchCode || article.branch?.code

  return (
    <aside
      ref={dockRef}
      className={`reading-dock${collapsed ? ' reading-dock--collapsed' : ''}`}
      aria-label="読書セッション"
      role={isModal ? 'dialog' : undefined}
      aria-modal={isModal ? 'true' : undefined}
    >
      <div className="reading-dock-head">
        <button
          type="button"
          className="reading-dock-heading"
          aria-expanded={!collapsed}
          aria-label={`${designation} の読書セッションを${collapsed ? '開く' : '折りたたむ'}`}
          onClick={() => setCollapsed(value => !value)}
        >
          <span className="reading-dock-kicker">READING SESSION{branchCode ? ` · ${branchCode}` : ''}</span>
          <strong>{designation}</strong>
          {article.title && <span className="reading-dock-heading-title">{article.title}</span>}
        </button>
        <div className="reading-dock-head-actions">
          <button
            type="button"
            ref={collapseButtonRef}
            className="icon-button reading-dock-collapse"
            aria-expanded={!collapsed}
            aria-label={collapsed ? '読書セッションを展開' : '読書セッションを折りたたむ'}
            onClick={() => setCollapsed(value => !value)}
          >
            <Icon name={collapsed ? 'up' : 'down'} size={18} />
          </button>
          <button type="button" className="icon-button" onClick={onClose} aria-label="読書セッションを閉じる">
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="reading-dock-body">
          {article.title && <p className="reading-dock-title">{article.title}</p>}
          {article.predicted && (
            <p className="reading-dock-predicted" role="note">
              公開前の予測リンクです。公開されるまで読了・保存・メモは記録できません。
            </p>
          )}

          <div className="reading-dock-links" aria-label="記事リンク">
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="button button-primary">
              日本語版を開く <Icon name="external" size={16} />
            </a>
            {article.originalUrl && article.originalUrl !== article.url && (
              <a href={article.originalUrl} target="_blank" rel="noopener noreferrer" className="button button-secondary">
                原語版 <Icon name="external" size={16} />
              </a>
            )}
          </div>

          <div className="reading-dock-actions" aria-label="記事の状態">
            <button
              type="button"
              className={`dock-action${isChecked ? ' active' : ''}`}
              aria-pressed={isChecked}
              onClick={onToggleRead}
              disabled={article.predicted}
            >
              <Icon name="check" size={17} /> {isChecked ? '読了' : '未読'}
            </button>
            <button
              type="button"
              className={`dock-action${isFavorite ? ' active' : ''}`}
              aria-pressed={isFavorite}
              onClick={onToggleFavorite}
              disabled={article.predicted}
            >
              <Icon name="bookmark" size={17} /> {isFavorite ? '保存済み' : '保存'}
            </button>
            <button
              type="button"
              className={`dock-action${isQueued ? ' active' : ''}`}
              aria-pressed={isQueued}
              onClick={onToggleQueue}
              disabled={article.predicted}
            >
              <Icon name="queue" size={17} /> {isQueued ? 'キュー済み' : 'あとで読む'}
            </button>
          </div>

          <div className="reading-dock-memo">
            <label htmlFor={memoId}>読後メモ</label>
            <textarea
              id={memoId}
              rows="3"
              value={memo}
              placeholder="印象、つながり、あとで調べたいこと"
              onChange={event => onMemoChange(event.target.value)}
              disabled={article.predicted}
            />
            <span className="field-helper">入力内容はこの端末に自動保存されます。</span>
          </div>

          {nextArticle && (
            <button
              type="button"
              className="reading-dock-next"
              onClick={onOpenNext}
              aria-label={`次の記事 ${nextArticle.designation || nextArticle.id} を開く`}
            >
              <strong>次へ · {nextArticle.designation || nextArticle.id}</strong>
              <Icon name="arrowRight" size={19} />
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
