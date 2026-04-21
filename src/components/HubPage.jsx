export default function HubPage({ branch, onOpenSidebar }) {
  return (
    <>
      <div className="content-toolbar">
        <div className="toolbar-row toolbar-row-top">
          <button className="toolbar-back" onClick={onOpenSidebar} aria-label="支部選択">≡</button>
          <span className="toolbar-title">ハブ・特殊ページ</span>
          <span className="toolbar-sub"> · {branch.nativeName}</span>
        </div>
      </div>

      <div className="hub-page">
        {branch.hubs.map(section => (
          <section key={section.cat} className="hub-section">
            <h2 className="hub-section-title">{section.cat}</h2>
            <div className="hub-grid">
              {section.items.map(item => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-card"
                >
                  <span className="hub-card-label">{item.label}</span>
                  <span className="hub-card-icon">↗</span>
                </a>
              ))}
            </div>
          </section>
        ))}

        {branch.hubs.length === 0 && (
          <p className="hub-empty">このサイドバーにはハブ情報がありません。</p>
        )}
      </div>
    </>
  )
}
