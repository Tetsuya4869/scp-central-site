import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

const ToastContext = createContext(null)
let _nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  // Check for a pending success message from import (set before reload)
  useEffect(() => {
    const pending = localStorage.getItem('scp-toast-pending')
    if (pending) {
      localStorage.removeItem('scp-toast-pending')
      try {
        const { msg, type } = JSON.parse(pending)
        show(msg, type)
      } catch {}
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((msg, type = 'info', duration = 3000) => {
    const id = ++_nextId
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const toast = {
    info:    (msg, dur)         => show(msg, 'info',    dur ?? 3000),
    success: (msg, dur)         => show(msg, 'success', dur ?? 3000),
    error:   (msg, dur)         => show(msg, 'error',   dur ?? 5000),
    // Queue a toast to show after window.location.reload()
    pending: (msg, type = 'success') =>
      localStorage.setItem('scp-toast-pending', JSON.stringify({ msg, type })),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="toast-container"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => el.classList.add('toast--visible'))
  }, [])

  return (
    <div
      ref={ref}
      className={`toast toast--${toast.type}`}
      role="alert"
    >
      <span className="toast-msg">{toast.msg}</span>
      <button
        className="toast-close"
        onClick={() => onDismiss(toast.id)}
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
