import { useMemo } from 'react'
import { BRANCHES } from '../data/branches.js'
import { generateSeriesArticles } from '../utils/urlGenerator.js'
import TITLES from '../data/titles.json'

function lookupArticle(id) {
  // Custom series (e.g. yidan-*)
  for (const branch of BRANCHES) {
    for (const series of branch.series) {
      if (series.type === 'custom') {
        const a = series.articles.find(a => a.id === id)
        if (a) return { ...a, branchCode: branch.code, branch }
      }
    }
  }
  // SCP articles: id = "{BRANCHCODE}-{number}"
  for (const branch of BRANCHES) {
    const prefix = branch.code + '-'
    if (id.startsWith(prefix)) {
      const number = parseInt(id.slice(prefix.length), 10)
      if (!isNaN(number)) {
        const [article] = generateSeriesArticles(branch.code, number, number)
        if (article) {
          const title = TITLES[branch.code]?.[String(number)] ?? ''
          return { ...article, branch, title }
        }
      }
    }
  }
  return null
}

export default function FavoritesPage({ favorites, toggleFavorite, onOpenSidebar }) {
  const items = useMemo(() => {
    return [...favorites].map(id => lookupArticle(id)).filter(Boolean)
  }, [favorites])

  const byBranch = useMemo(() => {
    const map = new Map()
    for (const item of items) {
      const code = item.branch.code
      if (!map.has(code)) map.set(code, { branch: item.branch, articles: [] })
      map.get(code).articles.push(item)
    }
    return [...map.values()]
  }, [items])

  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="支部選択">≡</button>
          <span className="toolbar-title">⭐ お気に入り</span>
          <div className="toolbar-spacer" />
          <span className="progress-text" style={{ marginRight: 8 }}>{items.length} 件</span>
        </div>
      </div>

      <div className="fav-page">
        {byBranch.length === 0 && (
          <p className="hub-empty">お気に入りはまだありません。<br />記事一覧の ★ ボタンで追加できます。</p>
        )}

        {byBranch.map(({ branch, articles }) => (
          <section key={branch.code} className="fav-section">
            <h2 className="fav-section-title">
              <span className="fav-branch-badge" style={{ background: branch.accent }}>
                {branch.code}
              </span>
              {branch.nativeName}
            </h2>
            <div className="fav-list">
              {articles.map(article => (
                <div key={article.id} className="fav-row">
                  <a
                    className="fav-link"
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="fav-designation">{article.designation}</span>
                    {article.title && <span className="fav-title">{article.title}</span>}
                  </a>
                  <button
                    className="fav-remove-btn"
                    onClick={() => toggleFavorite(article.id)}
                    title="お気に入りを解除"
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
