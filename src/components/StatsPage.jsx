import { useMemo, useState } from 'react'
import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import { loadReadDates, lookupArticle } from '../utils/lookupArticle.js'

function computeStreak(map) {
  const days = new Set()
  for (const ts of map.values()) {
    const d = new Date(ts)
    d.setHours(0, 0, 0, 0)
    days.add(d.getTime())
  }
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  let cur = days.has(today.getTime())
    ? today.getTime()
    : days.has(yesterday.getTime()) ? yesterday.getTime() : null
  if (cur === null) return 0
  let streak = 0
  while (days.has(cur)) { streak++; cur -= 86400000 }
  return streak
}

function getLast7Days(map) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    return { date: d, count: 0 }
  })
  for (const ts of map.values()) {
    const d = new Date(ts); d.setHours(0, 0, 0, 0)
    const entry = days.find(x => x.date.getTime() === d.getTime())
    if (entry) entry.count++
  }
  return days
}

function buildHeatmapData(map) {
  const dayCounts = new Map()
  for (const ts of map.values()) {
    const d = new Date(ts)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }
  return dayCounts
}

function fmtDate(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function StatsPage({ totalChecked, grandTotal, countChecked, onOpenSidebar, userRatings, goal, setGoal }) {
  const readDatesMap = useMemo(() => loadReadDates(), [])
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  const streak      = useMemo(() => computeStreak(readDatesMap), [readDatesMap])
  const last7       = useMemo(() => getLast7Days(readDatesMap),  [readDatesMap])
  const heatmapData = useMemo(() => buildHeatmapData(readDatesMap), [readDatesMap])
  const maxDay      = Math.max(...last7.map(d => d.count), 1)
  const totalPct    = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0

  const thisMonthCount = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear(), m = now.getMonth()
    let count = 0
    for (const ts of readDatesMap.values()) {
      const d = new Date(ts)
      if (d.getFullYear() === y && d.getMonth() === m) count++
    }
    return count
  }, [readDatesMap])

  const recentlyRead = useMemo(() => {
    return [...readDatesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, ts]) => {
        const article = lookupArticle(id)
        return article ? { ...article, ts } : null
      })
      .filter(Boolean)
  }, [readDatesMap])

  const branchStats = useMemo(() => BRANCHES.map(branch => {
    const allIds = branch.series.flatMap(s => {
      if (s.type === 'separator') return []
      if (s.type === 'custom') return s.articles.map(a => a.id)
      return generateSeriesArticles(branch.code, s.min, s.max).map(a => a.id)
    })
    const total = allIds.length
    const done  = countChecked(allIds)
    return { branch, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }), [countChecked])

  function exportCSV() {
    const rows = [['date', 'branch', 'id', 'designation', 'title']]
    const sorted = [...readDatesMap.entries()].sort((a, b) => a[1] - b[1])
    for (const [id, ts] of sorted) {
      const article = lookupArticle(id)
      if (!article) continue
      const d = new Date(ts)
      const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      rows.push([date, article.branch.code, id, article.designation, article.title ?? ''])
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `scp-reading-history-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const topRated = useMemo(() => {
    if (!userRatings || userRatings.size === 0) return []
    return [...userRatings.entries()]
      .filter(([, r]) => r >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, rating]) => {
        const article = lookupArticle(id)
        return article ? { ...article, myRating: rating } : null
      })
      .filter(Boolean)
  }, [userRatings])

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニュー">≡</button>
          <span className="toolbar-title">📊 統計</span>
          <div className="toolbar-spacer" />
          <button className="stats-csv-btn" onClick={exportCSV} title="読書履歴をCSVでダウンロード">
            📥 CSV
          </button>
        </div>
      </div>

      <div className="stats-page">

        {/* 合計進捗 */}
        <div className="stats-card">
          <div className="stats-card-title">合計進捗</div>
          <div className="stats-hero">
            <span className="stats-hero-num">{totalChecked.toLocaleString()}</span>
            <span className="stats-hero-denom"> / {grandTotal.toLocaleString()} 記事</span>
            <span className="stats-hero-pct">{totalPct}%</span>
          </div>
          <div className="stats-total-bar">
            <div className="stats-total-fill" style={{ width: `${totalPct}%` }} />
          </div>
        </div>

        {/* 今月の目標 */}
        <div className="stats-card stats-goal-card">
          <div className="stats-card-title">今月の読書目標</div>
          {goal?.monthly ? (
            <div className="stats-goal-body">
              <div className="stats-goal-nums">
                <span className="stats-hero-num" style={{ fontSize: '1.6rem' }}>{thisMonthCount}</span>
                <span className="stats-hero-denom"> / {goal.monthly} 記事</span>
                {thisMonthCount >= goal.monthly && <span className="stats-goal-achieved">達成！🎉</span>}
              </div>
              <div className="stats-goal-bar">
                <div className="stats-goal-fill" style={{ width: `${Math.min(100, Math.round((thisMonthCount / goal.monthly) * 100))}%` }} />
              </div>
              {editingGoal ? (
                <div className="stats-goal-edit">
                  <input
                    className="stats-goal-input"
                    type="number"
                    min="1"
                    max="9999"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setGoal({ monthly: parseInt(goalInput, 10) || null }); setEditingGoal(false) }
                      if (e.key === 'Escape') setEditingGoal(false)
                    }}
                    autoFocus
                  />
                  <button className="stats-goal-btn" onClick={() => { setGoal({ monthly: parseInt(goalInput, 10) || null }); setEditingGoal(false) }}>設定</button>
                  <button className="stats-goal-btn stats-goal-btn-del" onClick={() => { setGoal({ monthly: null }); setEditingGoal(false) }}>削除</button>
                </div>
              ) : (
                <button className="stats-goal-btn stats-goal-btn-edit" onClick={() => { setGoalInput(String(goal.monthly)); setEditingGoal(true) }}>目標を変更</button>
              )}
            </div>
          ) : (
            <div className="stats-goal-body">
              <div className="stats-zero-hint">今月の目標件数を設定しましょう</div>
              {editingGoal ? (
                <div className="stats-goal-edit">
                  <input
                    className="stats-goal-input"
                    type="number"
                    min="1"
                    max="9999"
                    value={goalInput}
                    placeholder="例: 30"
                    onChange={e => setGoalInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setGoal({ monthly: parseInt(goalInput, 10) || null }); setEditingGoal(false) }
                      if (e.key === 'Escape') setEditingGoal(false)
                    }}
                    autoFocus
                  />
                  <button className="stats-goal-btn" onClick={() => { setGoal({ monthly: parseInt(goalInput, 10) || null }); setEditingGoal(false) }}>設定</button>
                </div>
              ) : (
                <button className="stats-goal-btn stats-goal-btn-edit" onClick={() => { setGoalInput(''); setEditingGoal(true) }}>目標を設定</button>
              )}
            </div>
          )}
        </div>

        {/* ストリーク + 7日グラフ */}
        <div className="stats-row-2">
          <div className="stats-card">
            <div className="stats-card-title">連続読書日数</div>
            <div className="stats-hero">
              <span className="stats-hero-num">{streak}</span>
              <span className="stats-hero-denom"> 日</span>
            </div>
            {streak === 0 && <div className="stats-zero-hint">今日か昨日読んだ記事があるとカウント開始</div>}
          </div>

          <div className="stats-card stats-card-grow">
            <div className="stats-card-title">直近7日の読了数</div>
            <div className="stats-chart">
              {last7.map(({ date, count }) => (
                <div key={date.getTime()} className="stats-chart-col">
                  <span className="stats-chart-count">{count > 0 ? count : ''}</span>
                  <div
                    className="stats-chart-bar"
                    style={{ height: `${Math.max(3, Math.round((count / maxDay) * 52))}px` }}
                  />
                  <span className="stats-chart-label">{fmtDate(date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 活動カレンダー */}
        <div className="stats-card">
          <div className="stats-card-title">活動カレンダー（直近1年）</div>
          <ActivityHeatmap dayCounts={heatmapData} />
        </div>

        {/* 支部別進捗 */}
        <div className="stats-card">
          <div className="stats-card-title">支部別進捗</div>
          <div className="stats-branch-list">
            {branchStats.map(({ branch, done, total, pct }) => (
              <div key={branch.code} className="stats-branch-row">
                <span className="stats-branch-code" style={{ color: branch.accent }}>{branch.code}</span>
                <div className="stats-branch-bar-wrap">
                  <div className="stats-branch-bar-fill" style={{ width: `${pct}%`, background: branch.accent }} />
                </div>
                <span className="stats-branch-nums">{done}/{total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* マイ高評価 */}
        {topRated.length > 0 && (
          <div className="stats-card">
            <div className="stats-card-title">マイ高評価 (4★以上)</div>
            <div className="stats-recent-list">
              {topRated.map(article => (
                <div key={article.id} className="stats-recent-row">
                  <a
                    className="stats-recent-link"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.designation}
                  </a>
                  {article.title && <span className="stats-recent-title">{article.title}</span>}
                  <span className="my-rating-badge" style={{ flexShrink: 0 }}>
                    {'★'.repeat(article.myRating)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近読んだ */}
        {recentlyRead.length > 0 && (
          <div className="stats-card">
            <div className="stats-card-title">最近読んだ記事</div>
            <div className="stats-recent-list">
              {recentlyRead.map(article => (
                <div key={article.id} className="stats-recent-row">
                  <a
                    className="stats-recent-link"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {article.designation}
                  </a>
                  {article.title && <span className="stats-recent-title">{article.title}</span>}
                  <span className="stats-recent-date">{fmtDate(article.ts)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}

const MONTHS_JP = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function ActivityHeatmap({ dayCounts }) {
  const { cells, monthLabels } = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // The grid ends on the next Sunday (or today if today is Sunday)
    const lastDay = new Date(today)
    const dow = today.getDay() // 0=Sun
    lastDay.setDate(today.getDate() + (dow === 0 ? 0 : 7 - dow))

    // Grid starts 370 days before lastDay (371 days total = 53 weeks)
    const startDay = new Date(lastDay)
    startDay.setDate(lastDay.getDate() - 370)

    const cells = []
    for (let i = 0; i < 371; i++) {
      const d = new Date(startDay)
      d.setDate(startDay.getDate() + i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      cells.push({ date: d, key, count: dayCounts.get(key) ?? 0, isFuture: d > today })
    }

    // Month labels: one per 53 columns (7 cells each)
    const monthLabels = Array(53).fill(null)
    let lastMonth = -1
    for (let col = 0; col < 53; col++) {
      const d = cells[col * 7]?.date
      if (d) {
        const m = d.getMonth()
        if (m !== lastMonth) {
          monthLabels[col] = MONTHS_JP[m]
          lastMonth = m
        }
      }
    }

    return { cells, monthLabels }
  }, [dayCounts])

  return (
    <div className="heatmap-wrap">
      <div className="hm-month-row">
        {monthLabels.map((label, i) => (
          <div key={i} className="hm-month-cell">
            {label && <span className="hm-month-label">{label}</span>}
          </div>
        ))}
      </div>
      <div className="heatmap-grid">
        {cells.map(({ date, key, count, isFuture }) => {
          const level = isFuture ? 0 : count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : 3
          const title = isFuture ? '' : `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} · ${count}件`
          return (
            <div
              key={key}
              className={`hm-cell hm-level-${level}${isFuture ? ' hm-future' : ''}`}
              title={title}
            />
          )
        })}
      </div>
    </div>
  )
}
