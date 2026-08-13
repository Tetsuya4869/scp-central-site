import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

const items = [
  { id: 'home', label: 'ホーム', icon: 'home', selected: s => !s.branchCode && !s.view, target: { branchCode: null, view: null, seriesId: null } },
  { id: 'find', label: '探す', icon: 'search', selected: s => s.view === 'search', target: { branchCode: null, view: 'search', seriesId: null } },
  { id: 'read', label: '読む', icon: 'queue', selected: s => s.view === 'queue', target: { branchCode: null, view: 'queue', seriesId: null } },
  { id: 'saved', label: '保存', icon: 'bookmark', selected: s => s.view === 'favorites' || s.view === 'memos' },
  { id: 'progress', label: '進捗', icon: 'chart', selected: s => s.view === 'stats', target: { branchCode: null, view: 'stats', seriesId: null } },
]

export default function BottomNav({ selected, onSelect, queueCount = 0 }) {
  const [savedPickerOpen, setSavedPickerOpen] = useState(false)
  const navRef = useRef(null)
  const savedTriggerRef = useRef(null)
  const firstSavedOptionRef = useRef(null)

  useEffect(() => {
    if (!savedPickerOpen) return undefined
    firstSavedOptionRef.current?.focus()

    const handleKeyDown = event => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setSavedPickerOpen(false)
      savedTriggerRef.current?.focus()
    }
    const handlePointerDown = event => {
      if (!navRef.current?.contains(event.target)) setSavedPickerOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [savedPickerOpen])

  const selectSavedView = view => {
    setSavedPickerOpen(false)
    onSelect({ branchCode: null, view, seriesId: null })
  }

  return (
    <nav ref={navRef} className="bottom-nav" aria-label="主要ナビゲーション">
      {savedPickerOpen && (
        <div id="bottom-nav-saved-picker" className="bottom-nav-saved-picker" role="dialog" aria-modal="false" aria-label="保存した項目">
          <button
            ref={firstSavedOptionRef}
            type="button"
            className={selected.view === 'favorites' ? 'active' : ''}
            aria-current={selected.view === 'favorites' ? 'page' : undefined}
            onClick={() => selectSavedView('favorites')}
          >
            <Icon name="star" size={18} />
            <span>お気に入り</span>
          </button>
          <button
            type="button"
            className={selected.view === 'memos' ? 'active' : ''}
            aria-current={selected.view === 'memos' ? 'page' : undefined}
            onClick={() => selectSavedView('memos')}
          >
            <Icon name="note" size={18} />
            <span>メモ</span>
          </button>
        </div>
      )}
      {items.map(item => {
        const active = item.selected(selected)
        const isSaved = item.id === 'saved'
        return (
          <button
            key={item.id}
            ref={isSaved ? savedTriggerRef : undefined}
            type="button"
            className={`bottom-nav-item bottom-nav-item--${item.id}${active ? ' active' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-haspopup={isSaved ? 'dialog' : undefined}
            aria-expanded={isSaved ? savedPickerOpen : undefined}
            aria-controls={isSaved ? 'bottom-nav-saved-picker' : undefined}
            onClick={() => {
              if (isSaved) setSavedPickerOpen(open => !open)
              else {
                setSavedPickerOpen(false)
                onSelect(item.target)
              }
            }}
          >
            <span className="bottom-nav-icon-wrap">
              <Icon name={item.icon} size={19} />
              {item.id === 'read' && queueCount > 0 && <span className="bottom-nav-count">{Math.min(queueCount, 99)}</span>}
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
