import { Badge } from '@leasefy/cadence'

import type { PillTone } from '@/lib/admin/types'

const VARIANTE: Record<PillTone, 'success' | 'primary' | 'warning' | 'danger' | 'neutral' | 'outline'> = {
  ok: 'success',
  info: 'primary',
  warn: 'warning',
  bad: 'danger',
  muted: 'outline',
  neutral: 'neutral',
}

/**
 * La píldora de estado del admin: el `Badge` de Cadence (píldora, texto en
 * oración, los cuatro tonos del sistema). Se usa en todas las pantallas para
 * etapas de cartera, resultado de llamadas, estado de pagos, urgencia,
 * salud, llaves… (FRONT.md §5.2).
 */
export function Pill({
  tone = 'neutral',
  dot = false,
  children,
  className = '',
}: {
  tone?: PillTone
  /** El puntito de estado a la izquierda. */
  dot?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Badge variant={VARIANTE[tone]} dot={dot} className={className} data-tono={tone}>
      {children}
    </Badge>
  )
}
