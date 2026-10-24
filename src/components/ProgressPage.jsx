import { BRANCHES } from '../data/branches.js'
import { CATALOG_INDEX, getCatalogIdsForBranch } from '../utils/catalog.js'

// The catalogue owns publication status and deduplication. Series totals add up
// to branch totals even when a custom collection repeats an article.
const seriesIds = new Map()
for (const entry of CATALOG_INDEX.values()) {
  const key = `${entry.branchCode}:${entry.seriesId}`
  if (!seriesIds.has(key)) seriesIds.set(key, [])
  seriesIds.get(key).push(entry.id)
}

function percentage(done, total) {
  return total > 0 ? done / total * 100 : 0
}

function Progress({ label, done, total }) {
  const pct = percentage(done, total)
  const text = pct > 0 && pct < 0.1 ? '0.1%未満' : `${Math.round(pct * 10) / 10}%`
  return (
    <span className="tracker-progress">
      <span className="tracker-progress-copy">
        <span>{label}</span>
        <span><strong>{done.toLocaleString()}</strong> / {total.toLocaleString()} 件 <span className="tracker-muted">（{text}）</span></span>
      </span>
      <progress aria-label={`${label}の読了進捗`} max={total || 1} value={done} />
    </span>
  )
}

export default function ProgressPage({ totalChecked, grandTotal, countChecked, onNavigate }) {
  return (
    <section className="tracker-page">
      <div className="tracker-page-heading">
        <h1 data-view-heading tabIndex={-1}>読了の進捗</h1>
      </div>
      <Progress label="全体" done={totalChecked} total={grandTotal} />
      <p className="tracker-muted tracker-progress-note">支部を開くと、シリーズごとの進捗を確認できます。</p>
      <div className="tracker-branch-progress">
        {BRANCHES.map(branch => {
          const ids = getCatalogIdsForBranch(branch.code)
          return (
            <details className="tracker-progress-branch" key={branch.code}>
              <summary>
                <span className="tracker-branch-name"><strong>{branch.code}</strong> {branch.nativeName}</span>
                <Progress label={branch.code} done={countChecked(ids)} total={ids.length} />
              </summary>
              <ul className="tracker-progress-series-list">
                {branch.series.filter(series => series.type !== 'separator').map(series => {
                  const ids = seriesIds.get(`${branch.code}:${series.id}`) ?? []
                  const label = series.type === 'custom'
                    ? series.label
                    : `${String(series.min).padStart(3, '0')}〜${series.max}`
                  return (
                    <li key={series.id}>
                      <button type="button" onClick={() => onNavigate({ branchCode: branch.code, view: 'series', seriesId: series.id, targetId: null })}>
                        <Progress label={label} done={countChecked(ids)} total={ids.length} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </div>
    </section>
  )
}
