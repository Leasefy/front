/** Shared loading / error / empty states for admin screens. Never blank-screen. */

export function LoadingBlock({ label = 'cargando' }: { label?: string }) {
  return (
    <div className="card p-8 flex items-center justify-center">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-fg-muted flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-brand animate-pulse" />
        {label}
      </div>
    </div>
  )
}

export function ErrorBlock({ error }: { error: Error | string }) {
  const msg = typeof error === 'string' ? error : error.message
  return (
    <div className="card p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-bad flex items-center gap-2 mb-2">
        <span className="inline-block w-2 h-2 bg-bad" />
        error
      </div>
      <p className="text-sm text-fg-muted">{msg}</p>
    </div>
  )
}

export function EmptyBlock({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      {hint && <p className="text-xs text-fg-muted mt-1">{hint}</p>}
    </div>
  )
}
