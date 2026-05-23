import { useMemo } from 'react'
import { generateSeriesArticles } from '../utils/urlGenerator.js'

export default function BranchHomeScreen({ branch, countChecked, onSelectSeries, onSelectHubs, onBack }) {
  const seriesWithProgress = useMemo(() =>
    branch.series.map(s => {
      const allIds = s.type === 'custom'
        ? s.articles.map(a => a.id)
        : generateSeriesArticles(branch.code, s.min, s.max).map(a => a.id)
      const total = allIds.length
      const done = countChecked(allIds)
      const pct = total > 0 ? Math.round((done / total) * 100) : 0
      return { series: s, total, done, pct }
    }),
    [branch, countChecked]
  )

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onBack} aria-label="戻る">←</button>
          <span className="search-branch-badge" style={{ background: branch.accent }}>
            {branch.code}
          </span>
          <span className="toolbar-title">{branch.nativeName}</span>
          <div className="toolbar-spacer" />
        </div>
      </div>

      <div className="branch-home-screen">
        {branch.hubs && branch.hubs.length > 0 && (
          <div className="bhs-row bhs-hubs-row" onClick={onSelectHubs}>
            <div className="bhs-row-icon">🔗</div>
            <div className="bhs-row-body">
              <span className="bhs-row-label">ハブページ一覧</span>
            </div>
            <span className="bhs-chevron">›</span>
          </div>
        )}

        {seriesWithProgress.map(({ series, total, done, pct }) => (
          <div
            key={series.id}
            className="bhs-row bhs-series-row"
            onClick={() => onSelectSeries(series.id)}
          >
            <div className="bhs-row-body">
              <div className="bhs-row-top">
                <span className="bhs-row-label">{series.label}</span>
                <span className="bhs-row-count">{done}/{total} ({pct}%)</span>
              </div>
              <div className="bhs-progress">
                <div
                  className="bhs-progress-fill"
                  style={{ width: `${pct}%`, background: branch.accent }}
                />
              </div>
            </div>
            <span className="bhs-chevron">›</span>
          </div>
        ))}
      </div>
    </>
  )
}
