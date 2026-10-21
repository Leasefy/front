import { AnimatedNumber, KpiCard as DSKpiCard } from '@leasefy/cadence'

/** El conteo escribe la cifra con miles con punto y los decimales que trae. */
function comoElValor(valor: number): (n: number) => string {
  const decimales = Math.min((String(valor).split('.')[1] ?? '').length, 6)
  const nf = new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
  return (n) => nf.format(n)
}

const TONO = {
  default: '',
  ok: 'text-success',
  warn: 'text-warning',
  bad: 'text-danger',
} as const

/**
 * La tarjeta de una cifra del admin: el `KpiCard` de Cadence (rótulo mono,
 * cifra en JetBrains Mono que cuenta al cambiar, ícono neutro arriba a la
 * derecha y una línea de apoyo). `tone` tiñe la cifra con los tonos de Cadence
 * cuando la cifra misma es la alerta (fallidos, vencidos).
 */
export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: keyof typeof TONO
  icon?: React.ReactNode
  className?: string
}) {
  const esCifra = typeof value === 'number' && Number.isFinite(value)
  const valor =
    tone === 'default' ? (
      value
    ) : (
      <span className={TONO[tone]}>
        {esCifra ? <AnimatedNumber value={value as number} format={comoElValor(value as number)} /> : value}
      </span>
    )
  return (
    <DSKpiCard
      label={label}
      value={valor}
      format={esCifra && tone === 'default' ? comoElValor(value as number) : undefined}
      sublabel={hint}
      icon={icon}
      className={className}
    />
  )
}
