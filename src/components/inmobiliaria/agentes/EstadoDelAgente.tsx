'use client'

/**
 * La píldora de estado de un agente, junto al título de su pantalla
 * («Agentes IA»: Cobri, Niti). Nació en «Agente de pagos» y se volvió común
 * el 30-09-2026, cuando Calidad de publicaciones pasó a tener el mismo
 * encabezado: dos agentes, una sola manera de decir si están prendidos.
 *
 * 🔴 Cuatro estados y ninguno inventado:
 *   · `cargando`       — todavía no contestó: «Consultando…», no una afirmación.
 *   · `prendido`       — el back o el micro dijo que sí.
 *   · `apagado`        — el back o el micro dijo que no. Neutro, NO amarillo ni
 *                        rojo: apagado no es un error, es cómo está hoy.
 *   · `sin-verificar`  — no se pudo preguntar. Nunca «Apagado»: decir apagado
 *                        sin haber preguntado es la misma mentira que decir
 *                        prendido.
 */

import type { Icon } from '@phosphor-icons/react'
import { CheckCircle, CircleNotch, Power, Question } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'

export type EstadoDelAgente = 'cargando' | 'prendido' | 'apagado' | 'sin-verificar'

/** El estado a partir de una lectura: con dato manda el dato, con error «sin verificar». */
export function estadoDeLaLectura(lectura: {
  activo: boolean | undefined
  error: unknown
}): EstadoDelAgente {
  if (lectura.activo !== undefined) return lectura.activo ? 'prendido' : 'apagado'
  if (lectura.error) return 'sin-verificar'
  return 'cargando'
}

const PILDORA: Record<EstadoDelAgente, { clase: string; icon: Icon; texto: string; gira?: boolean }> = {
  cargando: { clase: 'bg-surface-muted text-fg-muted', icon: CircleNotch, texto: 'Consultando…', gira: true },
  prendido: { clase: 'bg-success-soft text-success', icon: CheckCircle, texto: 'Prendido' },
  apagado: { clase: 'bg-surface-muted text-fg', icon: Power, texto: 'Apagado' },
  'sin-verificar': { clase: 'bg-surface-muted text-fg-muted', icon: Question, texto: 'Sin verificar' },
}

export function PildoraDelAgente({
  estado,
  'data-testid': testId = 'estado-del-agente',
}: {
  estado: EstadoDelAgente
  'data-testid'?: string
}) {
  const { clase, icon: Icono, texto, gira } = PILDORA[estado]
  return (
    <span
      role="status"
      aria-live="polite"
      data-testid={testId}
      data-estado={estado}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-caption font-medium',
        clase,
      )}
    >
      <Icono
        className={cn('h-4 w-4 flex-shrink-0', gira && 'animate-spin motion-reduce:animate-none')}
        weight="bold"
        aria-hidden="true"
      />
      {texto}
    </span>
  )
}
