import { useMemo } from 'react'
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

function fmtDate(ts) {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function StatsPage({ totalChecked, grandTotal, countChecked, onOpenSidebar }) {
  const readDatesMap = useMemo(() => loadReadDates(), [])

  const streak   = useMemo(() => computeStreak(readDatesMap), [readDatesMap])
  const last7    = useMemo(() => getLast7Days(readDatesMap),  [readDatesMap])
  const maxDay   = Math.max(...last7.map(d => d.count), 1)
  const totalPct = grandTotal > 0 ? Math.round((totalChecked / grandTotal) * 100) : 0

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

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="メニュー">≡</button>
          <span className="toolbar-title">📊 統計</span>
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
