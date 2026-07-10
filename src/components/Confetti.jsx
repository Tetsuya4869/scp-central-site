import { useEffect, useRef, useState } from 'react'

const COLORS = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#FF8C42', '#A8E6CF']
const N = 50

export default function Confetti({ active, onDone }) {
  const timerRef = useRef(null)

  const [particles] = useState(() =>
    Array.from({ length: N }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[i % COLORS.length],
      width: 6 + Math.random() * 6,
      height: 4 + Math.random() * 4,
      duration: 1.8 + Math.random() * 1.5,
      delay: Math.random() * 0.7,
      rot: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
    }))
  )

  useEffect(() => {
    if (!active) return
    timerRef.current = setTimeout(onDone, 3500)
    return () => clearTimeout(timerRef.current)
  }, [active, onDone])

  if (!active) return null

  return (
    <div className="confetti-overlay" aria-hidden="true">
      {particles.map(p => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: p.width,
            height: p.height,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--rot': `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}
