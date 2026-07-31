import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { BRANCHES } from '../data/branches.js'

export default function CommandPalette({ isOpen, onClose, onNavigate, onToggleTheme }) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIdx(0)
      // Small delay so the element is mounted before focus
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  const allCommands = useMemo(() => {
    const cmds = [
      { id: 'go-search',    label: '🔍 全体検索を開く',    group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'search',    seriesId: null }) },
      { id: 'go-favorites', label: '⭐ お気に入りを開く',   group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'favorites', seriesId: null }) },
      { id: 'go-queue',     label: '📚 後で読むを開く',     group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'queue',     seriesId: null }) },
      { id: 'go-memos',     label: '✎ メモ一覧を開く',     group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'memos',     seriesId: null }) },
      { id: 'go-stats',     label: '📊 統計を開く',         group: 'ページ', action: () => onNavigate({ branchCode: null, view: 'stats',     seriesId: null }) },
      { id: 'toggle-theme', label: '🌙 テーマを切り替える', group: 'アクション', action: onToggleTheme },
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
    const selected = list.children[selectedIdx]
    if (selected) selected.scrollIntoView({ block: 'nearest' })
  }, [selectedIdx])

  const runSelected = useCallback(() => {
    const cmd = filtered[selectedIdx]
    if (!cmd) return
    cmd.action()
    onClose()
  }, [filtered, selectedIdx, onClose])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runSelected()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [filtered, runSelected, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="cp-overlay" onClick={onClose} />
      <div
        className="command-palette"
        role="dialog"
        aria-label="コマンドパレット"
        aria-modal="true"
      >
        <div className="cp-input-wrap">
          <span className="cp-search-icon" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            placeholder="コマンドや支部を検索..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck="false"
          />
          <kbd className="cp-esc-hint">ESC</kbd>
        </div>

        <div ref={listRef} className="cp-list" role="listbox" aria-label="コマンド一覧">
          {filtered.length === 0 && (
            <div className="cp-empty">一致するコマンドが見つかりません</div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              className={`cp-item${i === selectedIdx ? ' cp-item--selected' : ''}`}
              role="option"
              aria-selected={i === selectedIdx}
              onClick={() => { cmd.action(); onClose() }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span className="cp-item-label">{cmd.label}</span>
              <span className="cp-item-group">{cmd.group}</span>
            </div>
          ))}
        </div>

        <div className="cp-footer">
          <span><kbd>↑↓</kbd> 選択</span>
          <span><kbd>Enter</kbd> 実行</span>
          <span><kbd>Esc</kbd> 閉じる</span>
        </div>
      </div>
    </>
  )
}
