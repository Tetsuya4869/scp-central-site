import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'scp-goal-v1'

function loadGoal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : { monthly: null }
    const monthly = parsed?.monthly
    return { monthly: Number.isInteger(monthly) && monthly >= 1 && monthly <= 9999 ? monthly : null }
  } catch {
    return { monthly: null }
  }
}

function saveGoal(goal) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal))
  } catch {}
}

export function useGoal() {
  const [goal, setGoalState] = useState(() => loadGoal())

  useEffect(() => {
    const sync = event => {
      if (event.key === STORAGE_KEY) setGoalState(loadGoal())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const setGoal = useCallback((updates) => {
    const previous = loadGoal()
    const candidate = { ...previous, ...updates }
    const monthly = candidate.monthly
    if (monthly != null && (!Number.isInteger(monthly) || monthly < 1 || monthly > 9999)) return
    const next = { monthly: monthly ?? null }
    saveGoal(next)
    setGoalState(next)
  }, [])

  return { goal, setGoal }
}
