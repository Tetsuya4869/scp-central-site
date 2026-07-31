import { useMemo } from 'react'

const ACHIEVEMENTS = [
  { id: 'read-1',    icon: 'library', label: 'はじめの一歩',   desc: '初めて1記事を読んだ',        check: (n) => n >= 1 },
  { id: 'read-10',   icon: 'library', label: '10記事読破',     desc: '10記事を読んだ',              check: (n) => n >= 10 },
  { id: 'read-50',   icon: 'bookmark', label: '50記事読破',    desc: '50記事を読んだ',              check: (n) => n >= 50 },
  { id: 'read-100',  icon: 'target', label: '100記事読破',     desc: '100記事を読んだ',             check: (n) => n >= 100 },
  { id: 'read-500',  icon: 'target', label: '500記事読破',     desc: '500記事を読んだ',             check: (n) => n >= 500 },
  { id: 'read-1000', icon: 'star', label: '1000記事読破',      desc: '1000記事以上を読んだ',        check: (n) => n >= 1000 },
  { id: 'streak-3',  icon: 'chart', label: '3日連続',          desc: '3日連続で記事を読んだ',       check: (_, s) => s >= 3 },
  { id: 'streak-7',  icon: 'chart', label: '1週間連続',        desc: '7日連続で記事を読んだ',       check: (_, s) => s >= 7 },
  { id: 'streak-30', icon: 'up', label: '1ヶ月連続',           desc: '30日連続で記事を読んだ',      check: (_, s) => s >= 30 },
  { id: 'streak-100',icon: 'star', label: '100日連続',         desc: '100日連続で記事を読んだ',     check: (_, s) => s >= 100 },
]

export function useAchievements({ totalChecked, streak }) {
  return useMemo(() =>
    ACHIEVEMENTS.map(a => ({
      ...a,
      achieved: a.check(totalChecked, streak),
    })),
    [totalChecked, streak]
  )
}
