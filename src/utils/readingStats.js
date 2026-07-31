const MS_PER_DAY = 86400000

export function localDayOrdinal(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY)
}

export function computeStreak(map, now = new Date()) {
  const days = new Set([...map.values()].map(localDayOrdinal))
  const today = localDayOrdinal(now)
  let cursor = days.has(today) ? today : days.has(today - 1) ? today - 1 : null
  if (cursor === null) return 0

  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor--
  }
  return streak
}

export function computeLongestStreak(map) {
  const sorted = [...new Set([...map.values()].map(localDayOrdinal))].sort((a, b) => a - b)
  if (!sorted.length) return 0

  let longest = 1
  let current = 1
  for (let index = 1; index < sorted.length; index++) {
    if (sorted[index] - sorted[index - 1] === 1) {
      current++
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

export function computeWeeklyAvg(map) {
  const sorted = [...new Set([...map.values()].map(localDayOrdinal))].sort((a, b) => a - b)
  if (!sorted.length) return 0
  const spanDays = Math.max(1, sorted[sorted.length - 1] - sorted[0] + 1)
  const weeks = spanDays / 7
  return Math.round((map.size / Math.max(weeks, 1)) * 10) / 10
}
