'use client'

/**
 * SO-25/SO-26 (PQRS-FIX, 04-10-2026): las PQRS con el plazo legal vencido o a
 * punto de vencerse, arriba de la lista, y a quién se le escalan.
 *
 * Hasta hoy una PQRS vencida sólo decía «Vencido hace 1 día» en su fila: los
 * contadores no tenían «Vencidas» y ninguna pantalla decía que nadie recibía el
 * escalamiento (el cron de la 1:00 p. m. no escalaba nada sin esa persona).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WarningCircle } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { slaDePqrsApi, type SlaDePqrs } from '@/lib/api/sla-de-pqrs.service'

interface Props {
  vencidas: number
  porVencer: number
  onVer: (estado: 'vencidas' | 'porVencer') => void
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function AvisoDeVencidas({ vencidas, porVencer, onVer }: Props) {
  const [sla, setSla] = useState<SlaDePqrs | null>(null)
  useEffect(() => {
    slaDePqrsApi.ver().then(setSla).catch(() => setSla(null))
  }, [])

  const sinJefe = sla?.disponible && !sla.escalarAUserId
  if (vencidas === 0 && porVencer === 0 && !sinJefe) return null

  return (
    <section
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
        vencidas > 0 ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface',
      )}
      data-testid="pqrs-aviso-vencidas"
    >
      <div className="flex min-w-0 items-start gap-3">
        <WarningCircle className={cn('mt-0.5 h-5 w-5 shrink-0', vencidas > 0 ? 'text-danger' : 'text-warning')} />
        <div className="min-w-0 space-y-1 text-sm">
          {vencidas > 0 || porVencer > 0 ? (
            <p className="text-fg">
              {vencidas > 0 && (
                <button
                  type="button"
                  className="font-medium text-danger underline-offset-2 hover:underline"
                  onClick={() => onVer('vencidas')}
                  data-testid="pqrs-ver-vencidas"
                >
                  {plural(vencidas, 'vencida', 'vencidas')}
                </button>
              )}
              {vencidas > 0 && porVencer > 0 ? ' · ' : ''}
              {porVencer > 0 && (
                <button
                  type="button"
                  className="font-medium text-fg underline-offset-2 hover:underline"
                  onClick={() => onVer('porVencer')}
                  data-testid="pqrs-ver-por-vencer"
                >
                  {plural(porVencer, 'vence', 'vencen')} en 2 días hábiles o menos
                </button>
              )}
            </p>
          ) : null}
          {sinJefe ? (
            <p className="text-fg-muted" data-testid="pqrs-sin-escalamiento">
              Nadie recibe las PQRS vencidas: elige a quién se escalan en{' '}
              <Link
                href="/panel/inmobiliaria/configuracion/sla-de-pqrs"
                className="font-medium text-fg underline underline-offset-2"
              >
                Configuración → Plazo de PQRS
              </Link>
              .
            </p>
          ) : sla?.escalarANombre && vencidas > 0 ? (
            <p className="text-fg-muted">Las vencidas se le escalan a {sla.escalarANombre}.</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
