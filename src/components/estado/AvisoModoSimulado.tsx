'use client'

/**
 * AvisoModoSimulado — el cartel que dice, con todas las letras, que lo que hay
 * en pantalla no es real.
 *
 * Por qué existe: el modo simulado venía prendido por defecto fuera de
 * producción y no se anunciaba en ningún lado. En desarrollo y en *staging* el
 * panel servía datos inventados en silencio, así que quien probaba ahí —Nico
 * incluido— miraba nombres y montos falsos creyendo que eran los suyos, y daba
 * por buenas pantallas que «funcionaban» sólo porque un mock las llenaba. Cada
 * sesión de prueba terminaba en una conclusión falsa.
 *
 * Un simulado silencioso es peor que no tenerlo. Así que mientras esté
 * prendido, se ve; y no se puede cerrar, porque la única forma de sacarlo es
 * apagar el simulado (`NEXT_PUBLIC_USE_MOCK_API`), que es justamente lo que uno
 * quiere que haga quien lo ve.
 *
 * Con el simulado apagado —el caso normal, y siempre en producción— no dibuja
 * absolutamente nada: ni un nodo, ni una clase.
 *
 * Dónde se para: abajo a la izquierda, fijo. Arriba no puede ir porque el
 * <PlanHeader> es `sticky top-0` y las dos barras se pelearían el borde
 * superior; una franja a lo ancho, además, empujaría el contenido sin mover el
 * sidebar (que es fijo) y descuadraría el panel entero. Abajo a la derecha ya
 * vive el <PilotoDock>. Sube por encima de la nav móvil, que ocupa el pie
 * debajo de `lg`.
 */

import { Flask } from '@phosphor-icons/react'
import { isMockMode } from '@/lib/api/config'

export interface AvisoModoSimuladoProps {
  /** Sólo para tests: forzar el estado sin tocar el entorno del proceso. */
  activo?: boolean
  className?: string
}

export function AvisoModoSimulado({ activo, className }: AvisoModoSimuladoProps) {
  // `process.env.NEXT_PUBLIC_*` y `NODE_ENV` los inyecta Next en build, así que
  // el servidor y el cliente calculan lo mismo: no hay salto de hidratación.
  const prendido = activo ?? isMockMode()
  if (!prendido) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="aviso-modo-simulado"
      className={[
        // Por encima de diálogos y drawers a propósito: un modal que muestra
        // datos inventados necesita el aviso tanto como la pantalla de atrás.
        'fixed left-4 bottom-24 lg:bottom-4 z-[400]',
        'flex items-start gap-2.5 max-w-xs rounded-lg border px-3 py-2',
        'border-warning/30 bg-warning-soft text-warning shadow-lg',
        'text-xs leading-relaxed pointer-events-none select-none',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <Flask weight="fill" className="h-4 w-4 shrink-0 mt-px" aria-hidden="true" />
      <span>
        <strong className="font-semibold">Modo simulado.</strong> Los datos de
        esta pantalla son inventados: no son de tu inmobiliaria. Apagá{' '}
        <code className="font-mono">NEXT_PUBLIC_USE_MOCK_API</code> para ver los
        reales.
      </span>
    </div>
  )
}
