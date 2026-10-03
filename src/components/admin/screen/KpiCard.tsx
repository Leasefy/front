import { AnimatedNumber } from '@leasefy/cadence'

/** El conteo escribe la cifra igual que antes (`String(value)`): mismos decimales, sin separador agregado. */
function comoElValor(valor: number): (n: number) => string {
  const decimales = Math.min((String(valor).split('.')[1] ?? '').length, 6)
  return (n) => n.toFixed(decimales)
}

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
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${valueColor}`}>
        {/* Un número cuenta desde el anterior cuando cambia (Cadence); texto y nodos, tal cual. */}
        {typeof value === 'number' && Number.isFinite(value) ? <AnimatedNumber value={value} format={comoElValor(value)} /> : value}
      </div>
      {hint != null && <div className="text-xs text-fg-muted mt-1">{hint}</div>}
    </div>
  )
}
