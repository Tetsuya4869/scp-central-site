import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { BRANCHES } from '../data/branches.js'

export const COMMAND_PALETTE_DIALOG_ID = 'command-palette-dialog'
export const COMMAND_PALETTE_TRIGGER_LABEL = 'サイト内を検索・移動'

export default function CommandPalette({ isOpen, onClose, onNavigate, onToggleTheme }) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const backgroundElements = [
      document.querySelector('.app-header'),
      document.querySelector('.data-status-banner'),
      document.querySelector('.body-wrap'),
      document.querySelector('.reading-dock'),
      document.querySelector('.bottom-nav'),
    ].filter(Boolean)
    const previousInert = new Map(backgroundElements.map(element => [element, element.hasAttribute('inert')]))
    for (const element of backgroundElements) element.setAttribute('inert', '')
    setQuery('')
    setSelectedIdx(0)

    // Wait for the dialog subtree to mount before moving focus into it.
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      for (const [element, hadInert] of previousInert) {
        if (hadInert) element.setAttribute('inert', '')
        else element.removeAttribute('inert')
      }
      const previousFocus = previousFocusRef.current
      if (previousFocus?.isConnected) previousFocus.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

  const allCommands = useMemo(() => {
    const cmds = [
      { id: 'go-search',    label: '全体検索を開く',    group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'search',    seriesId: null }) },
      { id: 'go-favorites', label: 'お気に入りを開く',   group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'favorites', seriesId: null }) },
      { id: 'go-queue',     label: '後で読むを開く',     group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'queue',     seriesId: null }) },
      { id: 'go-memos',     label: 'メモ一覧を開く',     group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'memos',     seriesId: null }) },
      { id: 'go-stats',     label: '進捗を開く',         group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'stats',     seriesId: null }) },
      { id: 'toggle-theme', label: 'テーマを切り替える', group: 'アクション', action: onToggleTheme },
    ]

    for (const branch of BRANCHES) {
      const firstSeries = branch.series.find(s => s.type !== 'separator')
      if (firstSeries) {
        cmds.push({
          id: `branch-${branch.code}`,
          label: `${branch.code} · ${branch.nativeName}`,
          group: '支部トップ',
          action: () => onNavigate({ branchCode: branch.code, view: 'series', seriesId: firstSeries.id }),
        })
      }

      if (branch.hubs.length > 0) {
        cmds.push({
          id: `${branch.code}-hubs`,
          label: `${branch.code} · ハブ・特殊ページ`,
          group: `${branch.code}`,
          action: () => onNavigate({ branchCode: branch.code, view: 'hubs', seriesId: null }),
        })
      }

      for (const s of branch.series) {
        if (s.type === 'separator') continue
        cmds.push({
          id: `${branch.code}-${s.id}`,
          label: `${branch.code} · ${s.label}`,
          group: `${branch.code}`,
          action: () => onNavigate({ branchCode: branch.code, view: 'series', seriesId: s.id }),
        })
      }
    }

    return cmds
  }, [onNavigate, onToggleTheme])

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands.slice(0, 15)
    const q = query.toLowerCase()
    return allCommands
      .filter(c =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q)
      )
      .slice(0, 15)
  }, [query, allCommands])

  useEffect(() => {
    setSelectedIdx(0)
  }, [filtered])

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const selected = filtered[selectedIdx]
    if (!selected) return
    document.getElementById(`command-option-${selected.id}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [filtered, selectedIdx])

  const runSelected = useCallback(() => {
    const cmd = filtered[selectedIdx]
    if (!cmd) return
    cmd.action()
    onClose()
  }, [filtered, selectedIdx, onClose])

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length === 0) return
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length === 0) return
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      if (filtered.length > 0) setSelectedIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      if (filtered.length > 0) setSelectedIdx(filtered.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runSelected()
    }
  }, [filtered, runSelected])

  const handleDialogKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const dialog = dialogRef.current
    if (!dialog) return
    const focusable = Array.from(dialog.querySelectorAll(
      'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    )).filter(element => element.getAttribute('aria-hidden') !== 'true')

    if (focusable.length === 0) {
      event.preventDefault()
      dialog.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="cp-overlay" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        id={COMMAND_PALETTE_DIALOG_ID}
        className="command-palette"
        role="dialog"
        aria-label={COMMAND_PALETTE_TRIGGER_LABEL}
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="cp-input-wrap">
          <label className="cp-search-icon" htmlFor="command-palette-search">検索</label>
          <input
            ref={inputRef}
            id="command-palette-search"
            className="cp-input"
            type="search"
            role="combobox"
            placeholder="コマンドや支部を検索..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            spellCheck="false"
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-expanded="true"
            aria-activedescendant={filtered[selectedIdx] ? `command-option-${filtered[selectedIdx].id}` : undefined}
            aria-describedby="command-palette-help"
          />
          <button type="button" className="cp-esc-hint" onClick={onClose} aria-label="コマンドパレットを閉じる">ESC</button>
        </div>

        <div id="command-palette-results" ref={listRef} className="cp-list" role="listbox" aria-label="コマンド一覧">
          {filtered.length === 0 && (
            <div className="cp-empty" role="status">一致するコマンドが見つかりません</div>
          )}
          {filtered.map((cmd, i) => (
            <button
              type="button"
              key={cmd.id}
              id={`command-option-${cmd.id}`}
              className={`cp-item${i === selectedIdx ? ' cp-item--selected' : ''}`}
              role="option"
              aria-selected={i === selectedIdx}
              tabIndex={-1}
              onClick={() => { cmd.action(); onClose() }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="cp-item-label">{cmd.label}</span>
              <span className="cp-item-group">{cmd.group}</span>
            </button>
          ))}
        </div>

        <div className="cp-footer" id="command-palette-help">
          <span><kbd>↑↓</kbd> 選択</span>
          <span><kbd>Enter</kbd> 実行</span>
          <span><kbd>Esc</kbd> 閉じる</span>
        </div>
      </div>
    </>
  )
}
