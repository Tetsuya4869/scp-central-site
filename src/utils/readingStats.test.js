import { describe, expect, it } from 'vitest'
import { computeLongestStreak, computeStreak, computeWeeklyAvg, localDayOrdinal } from './readingStats.js'

describe('reading statistics calendar math', () => {
  it('counts adjacent local calendar dates even when timestamps are not 24 hours apart', () => {
    const first = new Date('2024-03-09T12:00:00-08:00').getTime()
    const second = new Date('2024-03-10T12:00:00-07:00').getTime()
    expect(second - first).toBe(23 * 60 * 60 * 1000)

    const dates = new Map([['a', first], ['b', second]])
    expect(computeLongestStreak(dates)).toBe(2)
  })

  it('deduplicates multiple reads on the same day for streaks but not the weekly volume', () => {
    const today = new Date(2026, 7, 1, 12)
    const yesterday = new Date(2026, 6, 31, 9)
    const dates = new Map([
      ['a', today.getTime()],
      ['b', new Date(2026, 7, 1, 18).getTime()],
      ['c', yesterday.getTime()],
    ])

    expect(localDayOrdinal(today) - localDayOrdinal(yesterday)).toBe(1)
    expect(computeStreak(dates, today)).toBe(2)
    expect(computeLongestStreak(dates)).toBe(2)
    expect(computeWeeklyAvg(dates)).toBeGreaterThan(0)
  })
})
