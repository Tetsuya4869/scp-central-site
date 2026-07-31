import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

const ToastContext = createContext(null)
let _nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // Check for a pending success message from import (set before reload)
  useEffect(() => {
    try {
      const pending = localStorage.getItem('scp-toast-pending')
      if (pending) {
        localStorage.removeItem('scp-toast-pending')
        const { msg, type } = JSON.parse(pending)
        show(msg, type)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((msg, type = 'info', duration = 3000) => {
    const id = ++_nextId
    setToasts(prev => [...prev, {
      id,
      msg,
      type,
      duration: type === 'error' ? null : duration,
    }])
    return id
  }, [])

  const toast = {
    info:    (msg, dur)         => show(msg, 'info',    dur ?? 3000),
    success: (msg, dur)         => show(msg, 'success', dur ?? 3000),
    error:   msg                => show(msg, 'error'),
    // Queue a toast to show after window.location.reload()
    pending: (msg, type = 'success') => {
      try { localStorage.setItem('scp-toast-pending', JSON.stringify({ msg, type })) } catch {}
    },
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const ref = useRef(null)
  const timerRef = useRef(null)
  const startedAtRef = useRef(0)
  const remainingRef = useRef(toast.duration)

  const pauseTimer = useCallback(() => {
    if (toast.duration == null || timerRef.current == null) return

    window.clearTimeout(timerRef.current)
    timerRef.current = null
    remainingRef.current = Math.max(
      0,
      remainingRef.current - (performance.now() - startedAtRef.current),
    )
  }, [toast.duration])

  const resumeTimer = useCallback(() => {
    if (toast.duration == null || timerRef.current != null) return

    startedAtRef.current = performance.now()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      remainingRef.current = 0

      // Pointer/focus events normally pause the timer first. This final guard
      // also prevents a queued timeout from removing its focused close button.
      if (ref.current?.matches(':hover') || ref.current?.contains(document.activeElement)) return
      onDismiss(toast.id)
    }, Math.max(0, remainingRef.current))
  }, [onDismiss, toast.duration, toast.id])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const frame = requestAnimationFrame(() => el.classList.add('toast--visible'))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    resumeTimer()
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [resumeTimer])

  return (
    <div
      ref={ref}
      className={`toast toast--${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onPointerEnter={pauseTimer}
      onPointerLeave={resumeTimer}
      onFocusCapture={pauseTimer}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) resumeTimer()
      }}
    >
      <span className="toast-msg">{toast.msg}</span>
      <button
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="通知を閉じる"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
