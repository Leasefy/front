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
 * 🔴 El `neutral` del `Badge` de Cadence es un gris claro FIJO (#F1EFEB), sin
 * variante oscura: en modo oscuro quedaba una pastilla blanca (QA del admin,
 * 19-10-2026: «Cobro por resultado» en la ficha). En oscuro toma los tokens del
 * tema; en claro queda exactamente como Cadence la pinta.
 */
const EL_NEUTRO_EN_OSCURO = ''

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
    <Badge
      variant={VARIANTE[tone]}
      dot={dot}
      className={tone === 'neutral' ? `${EL_NEUTRO_EN_OSCURO} ${className}`.trim() : className}
      data-tono={tone}
    >
      {children}
    </Badge>
  )
}
