import { useEffect, useMemo, useRef, useState } from 'react'
import { BRANCHES } from '../data/branches.js'
import { loadReadDates, lookupArticle } from '../utils/lookupArticle.js'
import { useDataReady } from '../data/dataStore.js'
import { useToast } from './Toast.jsx'
import { useAchievements } from '../hooks/useAchievements.js'
import Icon from './Icon.jsx'
import { computeLongestStreak, computeStreak, computeWeeklyAvg } from '../utils/readingStats.js'
import { getCatalogIdsForBranch, isCatalogArticle } from '../utils/catalog.js'

function computeProjection(totalChecked, grandTotal, map) {
  if (map.size === 0 || totalChecked >= grandTotal) return null
  const weeklyAvg = computeWeeklyAvg(map)
  if (weeklyAvg <= 0) return null
  const remaining = grandTotal - totalChecked
  const weeksLeft = remaining / weeklyAvg
  const d = new Date()
  d.setDate(d.getDate() + Math.round(weeksLeft * 7))
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
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

function getGoalValidationError(value) {
  const normalized = String(value ?? '').trim()
  const n = Number(normalized)
  return !normalized || !Number.isInteger(n) || n < 1 || n > 9999
    ? '1〜9999の整数で入力してください。'
    : ''
}

export default function StatsPage({ totalChecked, grandTotal, countChecked, onOpenSidebar, userRatings, goal, setGoal, onArticleOpen, dates }) {
  const toast = useToast()
  const dataReady = useDataReady() // データ到着後にタイトルを反映
  const readDatesMap = useMemo(() => {
    const source = dates ?? loadReadDates()
    return new Map([...source].filter(([id]) => isCatalogArticle(id)))
  }, [dates, dataReady])
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [goalError, setGoalError] = useState('')
  const goalEditTriggerRef = useRef(null)
  const wasEditingGoalRef = useRef(false)

  useEffect(() => {
    const wasEditing = wasEditingGoalRef.current
    wasEditingGoalRef.current = editingGoal
    if (!wasEditing || editingGoal) return undefined

    const frame = requestAnimationFrame(() => goalEditTriggerRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [editingGoal])

  const streak        = useMemo(() => computeStreak(readDatesMap),              [readDatesMap])
  const longestStreak = useMemo(() => computeLongestStreak(readDatesMap),       [readDatesMap])
  const weeklyAvg     = useMemo(() => computeWeeklyAvg(readDatesMap),           [readDatesMap])
  const projection    = useMemo(() => computeProjection(totalChecked, grandTotal, readDatesMap), [totalChecked, grandTotal, readDatesMap])
  const last7         = useMemo(() => getLast7Days(readDatesMap),                [readDatesMap])
  const heatmapData   = useMemo(() => buildHeatmapData(readDatesMap),           [readDatesMap])
  const maxDay        = Math.max(...last7.map(d => d.count), 1)
  const totalPct      = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0

  const achievements = useAchievements({ totalChecked, streak })

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
  }, [readDatesMap, dataReady])

  const branchStats = useMemo(() => BRANCHES.map(branch => {
    const allIds = getCatalogIdsForBranch(branch.code)
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
    toast.success(`${readDatesMap.size}件の読書履歴をエクスポートしました`)
  }

  function handleSetGoal(value) {
    const normalized = String(value ?? '').trim()
    const error = getGoalValidationError(normalized)
    if (error) {
      setGoalError(error)
      return
    }

    const n = Number(normalized)
    setGoal({ monthly: n })
    setGoalError('')
    setEditingGoal(false)
  }

  function handleGoalInputChange(event) {
    const value = event.target.value
    setGoalInput(value)
    if (goalError) setGoalError(getGoalValidationError(value))
  }

  function cancelGoalEdit() {
    setGoalError('')
    setEditingGoal(false)
  }

  function handleDeleteGoal() {
    setGoal({ monthly: null })
    setGoalInput('')
    setGoalError('')
    setEditingGoal(false)
  }

  function beginGoalEdit(value = '') {
    setGoalInput(value)
    setGoalError('')
    setEditingGoal(true)
  }

  const topRated = useMemo(() => {
    if (!userRatings || userRatings.size === 0) return []
    return [...userRatings.entries()]
      .filter(([id, r]) => isCatalogArticle(id) && r >= 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, rating]) => {
        const article = lookupArticle(id)
        return article ? { ...article, myRating: rating } : null
      })
      .filter(Boolean)
  }, [userRatings, dataReady])

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニューを開く">
            <Icon name="menu" />
          </button>
          <h1 className="toolbar-title" data-view-heading tabIndex={-1}>
            <Icon name="chart" />
            <span>統計</span>
          </h1>
          <div className="toolbar-spacer" />
          <button className="stats-csv-btn" onClick={exportCSV} title="読書履歴をCSVでダウンロード">
            CSVを書き出す
          </button>
        </div>
      </div>

      <div className="stats-page">

        {/* 合計進捗 */}
        <div className="stats-card">
          <h2 className="stats-card-title">合計進捗</h2>
          <div className="stats-hero">
            <span className="stats-hero-num">{totalChecked.toLocaleString()}</span>
            <span className="stats-hero-denom"> / {grandTotal.toLocaleString()} 記事</span>
            <span className="stats-hero-pct">{totalPct}%</span>
          </div>
          <div
            className="stats-total-bar"
            role="progressbar"
            aria-label="全記事の読了進捗"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={totalPct}
          >
            <div className="stats-total-fill" style={{ width: `${totalPct}%` }} />
          </div>
        </div>

        {/* 今月の目標 */}
        <div className="stats-card stats-goal-card">
          <h2 className="stats-card-title">今月の読書目標</h2>
          {goal?.monthly ? (
            <div className="stats-goal-body">
              <div className="stats-goal-nums">
                <span className="stats-hero-num stats-goal-current">{thisMonthCount}</span>
                <span className="stats-hero-denom"> / {goal.monthly} 記事</span>
                {thisMonthCount >= goal.monthly && <span className="stats-goal-achieved">達成</span>}
              </div>
              <div
                className="stats-goal-bar"
                role="progressbar"
                aria-label="今月の読書目標"
                aria-valuemin="0"
                aria-valuemax={goal.monthly}
                aria-valuenow={Math.min(thisMonthCount, goal.monthly)}
              >
                <div className="stats-goal-fill" style={{ width: `${Math.min(100, Math.round((thisMonthCount / goal.monthly) * 100))}%` }} />
              </div>
              {editingGoal ? (
                <div className="stats-goal-edit">
                  <div className="stats-goal-field">
                    <label className="stats-goal-label" htmlFor="monthly-goal-input">月間目標（記事数）</label>
                    <input
                      id="monthly-goal-input"
                      className="stats-goal-input"
                      type="number"
                      min="1"
                      max="9999"
                      step="1"
                      value={goalInput}
                      required
                      aria-invalid={goalError ? 'true' : undefined}
                      aria-describedby="goal-help goal-error"
                      aria-errormessage={goalError ? 'goal-error' : undefined}
                      onChange={handleGoalInputChange}
                      onBlur={() => setGoalError(getGoalValidationError(goalInput))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSetGoal(goalInput)
                        if (e.key === 'Escape') cancelGoalEdit()
                      }}
                      autoFocus
                    />
                    <span className="field-helper stats-goal-help" id="goal-help">1〜9999件の整数で入力</span>
                  </div>
                  <button className="stats-goal-btn" onClick={() => handleSetGoal(goalInput)}>設定</button>
                  <button className="stats-goal-btn stats-goal-btn-del" onClick={handleDeleteGoal}>削除</button>
                  <p className="stats-goal-error" id="goal-error" role={goalError ? 'alert' : undefined}>{goalError}</p>
                </div>
              ) : (
                <button ref={goalEditTriggerRef} className="stats-goal-btn stats-goal-btn-edit" onClick={() => beginGoalEdit(String(goal.monthly))}>目標を変更</button>
              )}
            </div>
          ) : (
            <div className="stats-goal-body">
              <div className="stats-zero-hint">今月の目標件数を設定しましょう</div>
              {editingGoal ? (
                <div className="stats-goal-edit">
                  <div className="stats-goal-field">
                    <label className="stats-goal-label" htmlFor="monthly-goal-input">月間目標（記事数）</label>
                    <input
                      id="monthly-goal-input"
                      className="stats-goal-input"
                      type="number"
                      min="1"
                      max="9999"
                      step="1"
                      value={goalInput}
                      placeholder="例: 30"
                      required
                      aria-invalid={goalError ? 'true' : undefined}
                      aria-describedby="goal-help goal-error"
                      aria-errormessage={goalError ? 'goal-error' : undefined}
                      onChange={handleGoalInputChange}
                      onBlur={() => setGoalError(getGoalValidationError(goalInput))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSetGoal(goalInput)
                        if (e.key === 'Escape') cancelGoalEdit()
                      }}
                      autoFocus
                    />
                    <span className="field-helper stats-goal-help" id="goal-help">1〜9999件の整数で入力</span>
                  </div>
                  <button className="stats-goal-btn" onClick={() => handleSetGoal(goalInput)}>設定</button>
                  <p className="stats-goal-error" id="goal-error" role={goalError ? 'alert' : undefined}>{goalError}</p>
                </div>
              ) : (
                <button ref={goalEditTriggerRef} className="stats-goal-btn stats-goal-btn-edit" onClick={() => beginGoalEdit()}>目標を設定</button>
              )}
            </div>
          )}
        </div>

        {/* 詳細統計 */}
        <div className="stats-card">
          <h2 className="stats-card-title">詳細統計</h2>
          <div className="stats-extra-row">
            <div className="stats-mini-card">
              <div className="stats-mini-label">現在の連続</div>
              <div className="stats-mini-value">{streak}<span className="stats-mini-unit"> 日</span></div>
            </div>
            <div className="stats-mini-card">
              <div className="stats-mini-label">最長連続記録</div>
              <div className="stats-mini-value">{longestStreak}<span className="stats-mini-unit"> 日</span></div>
            </div>
            <div className="stats-mini-card">
              <div className="stats-mini-label">週平均読了数</div>
              <div className="stats-mini-value">{weeklyAvg}<span className="stats-mini-unit"> 記事</span></div>
            </div>
            {projection && (
              <div className="stats-mini-card">
                <div className="stats-mini-label">全制覇予測</div>
                <div className="stats-mini-value stats-projection-value">{projection}</div>
              </div>
            )}
          </div>
        </div>

        {/* ストリーク + 7日グラフ */}
        <div className="stats-row-2">
          <div className="stats-card">
            <h2 className="stats-card-title">連続読書日数</h2>
            <div className="stats-hero">
              <span className="stats-hero-num">{streak}</span>
              <span className="stats-hero-denom"> 日</span>
            </div>
            {streak === 0 && <div className="stats-zero-hint">今日か昨日読んだ記事があるとカウント開始</div>}
          </div>

          <div className="stats-card stats-card-grow">
            <h2 className="stats-card-title">直近7日の読了数</h2>
            <div className="stats-chart">
              {last7.map(({ date, count }) => (
                <div key={date.getTime()} className="stats-chart-col">
                  <span className="stats-chart-count">{count > 0 ? count : ''}</span>
                  <div
                    className="stats-chart-bar"
                    style={{ height: `${Math.max(3, Math.round((count / maxDay) * 52))}px` }}
                    aria-hidden="true"
                  />
                  <span className="stats-chart-label">{fmtDate(date)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 活動カレンダー */}
        <div className="stats-card">
          <h2 className="stats-card-title">活動カレンダー（直近1年）</h2>
          <ActivityHeatmap dayCounts={heatmapData} />
        </div>

        {/* 支部別進捗 */}
        <div className="stats-card">
          <h2 className="stats-card-title">支部別進捗</h2>
          <div className="stats-branch-list">
            {branchStats.map(({ branch, done, total, pct }) => (
              <div key={branch.code} className="stats-branch-row">
                <span className="stats-branch-code">{branch.code}</span>
                <div
                  className="stats-branch-bar-wrap"
                  role="progressbar"
                  aria-label={`${branch.nativeName}の読了進捗`}
                  aria-valuemin="0"
                  aria-valuemax={total}
                  aria-valuenow={done}
                >
                  <div className="stats-branch-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="stats-branch-nums">{done}/{total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* マイ高評価 */}
        {topRated.length > 0 && (
          <div className="stats-card">
            <h2 className="stats-card-title">マイ高評価（4点以上）</h2>
            <div className="stats-recent-list">
              {topRated.map(article => (
                <div key={article.id} className="stats-recent-row">
                  <a
                    className="stats-recent-link"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onArticleOpen?.(article, { source: 'stats-top-rated' })}
                  >
                    {article.designation}
                  </a>
                  {article.title && <span className="stats-recent-title">{article.title}</span>}
                  <span className="my-rating-badge" style={{ flexShrink: 0 }}>
                    {article.myRating} / 5
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最近読んだ */}
        {recentlyRead.length > 0 && (
          <div className="stats-card">
            <h2 className="stats-card-title">最近読んだ記事</h2>
            <div className="stats-recent-list">
              {recentlyRead.map(article => (
                <div key={article.id} className="stats-recent-row">
                  <a
                    className="stats-recent-link"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onArticleOpen?.(article, { source: 'stats-recent' })}
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

        {/* 実績・バッジ */}
        <div className="stats-card">
          <h2 className="stats-card-title">実績・バッジ</h2>
          <div className="achievements-grid">
            {achievements.map(a => (
              <div
                key={a.id}
                className={`achievement-badge${a.achieved ? ' achieved' : ''}`}
                title={a.desc}
              >
                <span className="achievement-icon" aria-hidden="true"><Icon name={a.icon} size={22} /></span>
                <span className="sr-only">{a.achieved ? '達成済み: ' : '未達成: '}</span>
                <span className="achievement-label">{a.label}</span>
                <span className="achievement-desc">{a.desc}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

const MONTHS_JP = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function ActivityHeatmap({ dayCounts }) {
  const { cells, monthLabels, summary, accessibleRows } = useMemo(() => {
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

    const elapsedCells = cells.filter(cell => !cell.isFuture)
    const totalReads = elapsedCells.reduce((total, cell) => total + cell.count, 0)
    const activeDays = elapsedCells.reduce((total, cell) => total + (cell.count > 0 ? 1 : 0), 0)

    return {
      cells,
      monthLabels,
      summary: `直近1年の活動カレンダー。読了${totalReads}件、活動日${activeDays}日。`,
      accessibleRows: [...elapsedCells].reverse(),
    }
  }, [dayCounts])

  return (
    <div className="heatmap-wrap">
      <div className="hm-month-row" aria-hidden="true">
        {monthLabels.map((label, i) => (
          <div key={i} className="hm-month-cell">
            {label && <span className="hm-month-label">{label}</span>}
          </div>
        ))}
      </div>
      <div className="heatmap-grid" role="img" aria-label={summary}>
        {cells.map(({ date, key, count, isFuture }) => {
          const level = isFuture ? 0 : count === 0 ? 0 : count <= 2 ? 1 : count <= 4 ? 2 : 3
          const title = isFuture ? '' : `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} · ${count}件`
          return (
            <div
              key={key}
              className={`hm-cell hm-level-${level}${isFuture ? ' hm-future' : ''}`}
              title={title}
              aria-hidden="true"
            />
          )
        })}
      </div>
      <details className="heatmap-data">
        <summary>日別データを表で見る</summary>
        <div className="heatmap-table-wrap">
          <table className="heatmap-table">
            <caption className="sr-only">直近1年の日別読了件数</caption>
            <thead>
              <tr>
                <th scope="col">日付</th>
                <th scope="col">読了数</th>
              </tr>
            </thead>
            <tbody>
              {accessibleRows.map(({ date, key, count }) => (
                <tr key={key}>
                  <th scope="row">
                    <time dateTime={key}>{date.getFullYear()}年{date.getMonth() + 1}月{date.getDate()}日</time>
                  </th>
                  <td>{count}件</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
