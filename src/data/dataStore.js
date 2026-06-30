import { useSyncExternalStore } from 'react'

/**
 * 大きなデータJSON（titles / char_counts / ratings）を動的importで遅延ロードする。
 * 静的importだとメインJSへインライン化され初回ロードが重くなるため、
 * ここで別チャンク化し、到着するまでは空オブジェクトを返す（番号表示等は即時動作）。
 * データ到着時は useDataReady() を購読しているコンポーネントが再レンダーされ、
 * タイトル・文字数・評価がポップインで埋まる。
 */

let _titles = {}
let _charCounts = {}
let _ratings = {}
let _loaded = false
let _promise = null

const _subs = new Set()

export const getTitles = () => _titles
export const getCharCounts = () => _charCounts
export const getRatings = () => _ratings

function subscribe(fn) {
  _subs.add(fn)
  return () => _subs.delete(fn)
}

const snapshot = () => _loaded

export function loadData() {
  if (_promise) return _promise
  _promise = Promise.all([
    import('./titles.json'),
    import('./char_counts.json'),
    import('./ratings.json'),
  ])
    .then(([t, c, r]) => {
      _titles = t.default
      _charCounts = c.default
      _ratings = r.default
      _loaded = true
      _subs.forEach(fn => fn())
    })
    .catch(e => console.error('data load failed', e))
  return _promise
}

export function useDataReady() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

// モジュール読み込み時に即キック（React mount と並列でフェッチ開始）
loadData()
