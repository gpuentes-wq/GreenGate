import type { ReactNode } from 'react'

export function Insignia({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' +
        (ok ? 'bg-gg-light text-gg-dark' : 'bg-gray-100 text-gray-400')
      }
    >
      <span>{ok ? '✓' : '○'}</span>
      {label}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
      {children}
    </div>
  )
}
