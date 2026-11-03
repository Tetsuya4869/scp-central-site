import { Component } from 'react'

// A failed optional demo chunk must not replace the real checklist or imply
// that the reader's saved records are corrupt.
export default class DemoBoundary extends Component {
  state = { failed: false }
  focusFrame = null

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.focusFrame = requestAnimationFrame(() => {
      document.getElementById('demo-load-error-heading')?.focus({ preventScroll: true })
    })
  }

  componentWillUnmount() {
    if (this.focusFrame != null) cancelAnimationFrame(this.focusFrame)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <section className="tracker-page" role="alert">
        <div className="tracker-page-heading">
          <h1 id="demo-load-error-heading" data-view-heading tabIndex={-1}>操作イメージを読み込めませんでした</h1>
        </div>
        <p className="tracker-muted">実際の読了・お気に入りの記録はそのままです。再読み込みするか、一覧に戻ってご利用ください。</p>
        <div className="demo-load-actions">
          <button type="button" onClick={this.props.onExit}>実際の一覧へ戻る</button>
          <button type="button" onClick={() => window.location.reload()}>ページを再読み込み</button>
        </div>
      </section>
    )
  }
}
