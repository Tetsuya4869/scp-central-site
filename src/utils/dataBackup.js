const KEYS = {
  checklist: 'scp-checklist-v1',
  favorites: 'scp-favorites-v1',
  memos:     'scp-memos-v1',
  readDates: 'scp-readdates-v1',
}

export function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    checklist: JSON.parse(localStorage.getItem(KEYS.checklist) || '[]'),
    favorites: JSON.parse(localStorage.getItem(KEYS.favorites) || '[]'),
    memos:     JSON.parse(localStorage.getItem(KEYS.memos)     || '{}'),
    readDates: JSON.parse(localStorage.getItem(KEYS.readDates) || '{}'),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scp-checklist-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function importData(jsonText) {
  const data = JSON.parse(jsonText)
  if (!data || data.version !== 1) throw new Error('形式が不正です')

  // checklist: 既存 ∪ インポート（どちらかにあれば残す）
  if (Array.isArray(data.checklist)) {
    const existing = new Set(JSON.parse(localStorage.getItem(KEYS.checklist) || '[]'))
    data.checklist.forEach(id => existing.add(id))
    localStorage.setItem(KEYS.checklist, JSON.stringify([...existing]))
  }

  // favorites: 既存 ∪ インポート
  if (Array.isArray(data.favorites)) {
    const existing = new Set(JSON.parse(localStorage.getItem(KEYS.favorites) || '[]'))
    data.favorites.forEach(id => existing.add(id))
    localStorage.setItem(KEYS.favorites, JSON.stringify([...existing]))
  }

  // memos: 既存を残しつつインポートで上書きマージ
  if (data.memos && typeof data.memos === 'object') {
    const existing = JSON.parse(localStorage.getItem(KEYS.memos) || '{}')
    localStorage.setItem(KEYS.memos, JSON.stringify({ ...existing, ...data.memos }))
  }

  // readDates: 既存を残しつつインポートで上書きマージ
  if (data.readDates && typeof data.readDates === 'object') {
    const existing = JSON.parse(localStorage.getItem(KEYS.readDates) || '{}')
    localStorage.setItem(KEYS.readDates, JSON.stringify({ ...existing, ...data.readDates }))
  }
}
