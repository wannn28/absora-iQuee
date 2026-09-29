import { useEffect, type ReactNode } from 'react'

const NAMED: Record<string, string> = {
  'ethan parker': 'ethan',
  'liam carter': 'liam',
  'noah mitchell': 'noah',
  'ava thompson': 'ava',
  'mia robinson': 'mia',
  'olivia bennett': 'olivia',
  'james cooper': 'james',
  'harper diaz': 'harper',
  'benjamin brooks': 'benjamin',
  'charlotte lee': 'charlotte',
  'henry ward': 'henry',
  'amelia foster': 'amelia',
  'sophia adams': 'sophia',
  'lucas morgan': 'lucas',
  'mason reed': 'mason',
  'justin crown': 'justin',
  'emily': 'emily',
  'muhammad': 'muhammad',
  'you': 'you',
}

const POOL = ['g0', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'ethan', 'ava', 'noah', 'sophia']

function faceFor(name: string) {
  const key = name.trim().toLowerCase()
  if (NAMED[key]) return NAMED[key]
  const first = key.split(/\s+/)[0]
  if (first && NAMED[first]) return NAMED[first]
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return POOL[h % POOL.length]
}

export function Avatar({ name, color, className = '' }: { name: string; color?: string; className?: string }) {
  const id = faceFor(name || 'you')
  return (
    <span className={`av ${className}`} style={{ background: color || '#efeae6' }} title={name}>
      <img src={`/avatars/${id}.svg`} alt="" />
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
