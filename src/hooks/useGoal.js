import { useState, useCallback } from 'react'

const STORAGE_KEY = 'scp-goal-v1'

function loadGoal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : { monthly: null }
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

  const setGoal = useCallback((updates) => {
    setGoalState(prev => {
      const next = { ...prev, ...updates }
      saveGoal(next)
      return next
    })
  }, [])

  return { goal, setGoal }
}
