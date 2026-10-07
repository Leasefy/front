'use client'

/**
 * Retención sin activar (QA 04-10, IA-C-01).
 *
 * El micro apaga TODAS las rutas de Retención con un 404 «Retención no está
 * habilitada» mientras su interruptor no esté prendido (lo prende Leasefy, no
 * la inmobiliaria). Antes la pantalla caía a datos inventados con un aviso que
 * nombraba archivos del código. Ahora dice la verdad: no está activada, qué
 * haría y a quién pedirla. Sin rutas, sin nombres de archivo, sin cifras.
 */
import { HeartStraight } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/empty-state'

const LO_QUE_HARIA = [
  'Revisar a tus propietarios e inmuebles y decirte quién está en riesgo de salir del portafolio.',
  'Explicar la causa (pagos atrasados, inmueble vacío, mantenimientos, poca comunicación) y cuánta comisión está en juego.',
  'Proponerte un plan con tareas para tu equipo. Ningún mensaje le sale a un propietario sin que alguien lo apruebe.',
]

export function RetencionApagada({ className }: { className?: string }) {
  return (
    <div className={className} data-testid="retencion-apagada">
      <EmptyState
        icon={HeartStraight}
        title="Retención no está activada todavía para tu inmobiliaria."
        description="Para activarla, escríbele a tu contacto de Leasefy."
      >
        <div>
          <p className="text-sm font-medium text-fg">Cuando esté activa, Retención va a:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-muted">
            {LO_QUE_HARIA.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </EmptyState>
    </div>
  )
}
