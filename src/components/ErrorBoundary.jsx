import { Component } from 'react'

/**
 * 予期せぬ例外（localStorage破損・描画エラー等）でアプリ全体が白画面になるのを防ぐ。
 * フォールバックUIに「再読込」と「設定データを消去して再読込」の復旧導線を出す。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    if (!window.confirm('保存された読了状況・お気に入り・メモなどの設定データをすべて消去します。よろしいですか？')) {
      return
    }
    try {
      localStorage.clear()
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h1>エラーが発生しました</h1>
            <p>
              画面の表示中に予期せぬエラーが発生しました。
              再読込しても直らない場合は、保存データが壊れている可能性があります。
            </p>
            {this.state.error?.message && (
              <pre className="error-boundary-detail">{String(this.state.error.message)}</pre>
            )}
            <div className="error-boundary-actions">
              <button className="error-boundary-btn primary" onClick={this.handleReload}>
                再読込
              </button>
              <button className="error-boundary-btn" onClick={this.handleReset}>
                設定データを消去して再読込
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
