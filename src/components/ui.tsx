import { useEffect, type ReactNode } from 'react'
import { initials } from '../api'

export function Avatar({ name, color, className = '' }: { name: string; color: string; className?: string }) {
  return (
    <span className={`av ${className}`} style={{ background: color }} aria-hidden>
      {initials(name)}
    </span>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

export function Ring({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0
  const r = 8
  const c = 2 * Math.PI * r
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r={r} fill="none" stroke="#e4e7ee" strokeWidth="3" />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        stroke="#2f6bff"
        strokeWidth="3"
        strokeDasharray={`${c * pct} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 10 10)"
      />
    </svg>
  )
}
