/** Hero KPI stat card (dashboard, payments, QA, etc.). */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'default' | 'ok' | 'warn' | 'bad'
}) {
  const valueColor =
    tone === 'ok' ? 'text-ok' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-bad' : 'text-fg'
  return (
    <div className="card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${valueColor}`}>{value}</div>
      {hint != null && <div className="text-xs text-fg-muted mt-1">{hint}</div>}
    </div>
  )
}
