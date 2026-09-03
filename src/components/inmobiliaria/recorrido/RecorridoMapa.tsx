'use client'

/**
 * RecorridoMapa — los 11 pasos del recorrido, en dos tramos: lo que hace el
 * inquilino (1–6) y lo que te toca a vos (7–11), con el corte donde cambia de
 * manos dibujado entre los dos.
 *
 * Antes era una lista vertical de once filas con riel: correcta, pero larga y
 * fea como presentación («esto está horrible… mejorá muchísimo eso a nivel
 * UI», Nico, 2026-09-03). Ahora cada paso es una card chica en una grilla por
 * tramo: se ve de un vistazo quién hace qué y dónde entra la inmobiliaria.
 *
 * Por qué no usa el `Stepper` de Cadence: el de Cadence es de solo lectura
 * (`Step` no acepta `href` ni `onClick`). Los pasos de la inmobiliaria son
 * navegables — el mapa sirve para meterse en el recorrido, no sólo para
 * entenderlo.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ArrowsLeftRight, Check } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { PASOS_RECORRIDO, type PasoKey, type PasoRecorrido } from '@/lib/recorrido/pasos'

export interface RecorridoMapaProps {
  /**
   * Paso en el que está el candidato que se está mirando. Sin esto el mapa es
   * puramente explicativo: no marca nada como hecho ni como pendiente.
   */
  pasoActual?: PasoKey
  /** Rutas de los pasos que dependen del contexto (comparar, decidir). */
  hrefs?: Partial<Record<PasoKey, string>>
  className?: string
}

type Estado = 'hecho' | 'actual' | 'pendiente' | 'neutro'

function estadoDe(paso: PasoRecorrido, actual: PasoRecorrido | undefined): Estado {
  if (!actual) return 'neutro'
  if (paso.numero < actual.numero) return 'hecho'
  if (paso.numero === actual.numero) return 'actual'
  return 'pendiente'
}

const MARCA: Record<Estado, string> = {
  hecho: 'bg-primary/15 text-primary border-primary/30',
  actual: 'bg-primary text-white border-primary',
  pendiente: 'border-border bg-bg text-fg-subtle',
  neutro: 'border-border bg-surface-muted text-fg-muted',
}

const CARD: Record<Estado, string> = {
  hecho: 'border-border bg-surface-muted/50',
  actual: 'border-primary bg-surface shadow-sm ring-1 ring-primary/20',
  pendiente: 'border-border bg-surface',
  neutro: 'border-border bg-surface',
}

export function RecorridoMapa({ pasoActual, hrefs, className }: RecorridoMapaProps) {
  const { t } = useI18n()
  const pathname = usePathname()
  const actual = pasoActual ? PASOS_RECORRIDO.find((p) => p.key === pasoActual) : undefined

  const delInquilino = PASOS_RECORRIDO.filter((p) => p.actor === 'inquilino')
  const delaInmobiliaria = PASOS_RECORRIDO.filter((p) => p.actor === 'inmobiliaria')

  const card = (paso: PasoRecorrido) => {
    const estado = estadoDe(paso, actual)
    const declarado = hrefs?.[paso.key] ?? paso.href
    // Un «Ver →» que lleva a la pantalla en la que ya estás es ruido; se
    // oculta. Pero ese paso SÍ tiene pantalla —estás en ella—, así que no
    // debe caer en el «todavía sin pantalla» de abajo.
    const esLaPantallaActual = declarado != null && declarado === pathname
    // Un paso del inquilino no se enlaza NUNCA: sus pantallas están cerradas
    // con `allowedRoles={['tenant']}` y el guard devuelve al agente al mismo
    // lugar. Un link que parpadea y no lleva a ningún lado es peor que ninguno.
    const href = esLaPantallaActual || paso.actor === 'inquilino' ? null : declarado
    const esDeLaInmobiliaria = paso.actor === 'inmobiliaria'

    return (
      <li
        key={paso.key}
        className={cn('flex h-full flex-col gap-2.5 rounded-lg border p-4 transition-colors', CARD[estado])}
        data-estado={estado}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            data-paso={paso.numero}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs tabular-nums',
              MARCA[estado],
            )}
          >
            {estado === 'hecho' ? <Check className="h-3.5 w-3.5" weight="bold" /> : paso.numero}
          </span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]',
              esDeLaInmobiliaria ? 'bg-primary-soft text-primary' : 'bg-surface-muted text-fg-muted',
            )}
          >
            {esDeLaInmobiliaria ? t('inmobiliaria.recorrido.actorInmobiliaria') : t('inmobiliaria.recorrido.actorInquilino')}
          </span>
        </div>

        <div className="min-w-0">
          <p className={cn('text-sm font-semibold leading-snug', estado === 'pendiente' ? 'text-fg-muted' : 'text-fg')}>
            {t(paso.labelKey)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-fg-muted">{t(paso.descKey)}</p>
        </div>

        {href ? (
          <Link
            href={href}
            className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {t('inmobiliaria.recorrido.verPaso')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          esDeLaInmobiliaria &&
          !esLaPantallaActual && (
            // Honestidad: es un paso suyo y todavía no tiene pantalla propia.
            <p className="mt-auto text-xs text-fg-subtle">{t('inmobiliaria.recorrido.sinPantalla')}</p>
          )
        )}
      </li>
    )
  }

  const tramo = (titulo: string, rango: string, pasos: PasoRecorrido[], columnas: string, tono: string) => (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('h-2 w-2 rounded-full', tono)} aria-hidden="true" />
        <h3 className="text-sm font-medium text-fg">{titulo}</h3>
        <span className="font-mono text-xs tabular-nums text-fg-subtle">{rango}</span>
      </div>
      <ol className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-3', columnas)}>{pasos.map(card)}</ol>
    </section>
  )

  return (
    <div className={cn('space-y-5', className)} data-testid="recorrido-mapa">
      {tramo(
        t('inmobiliaria.recorrido.esperandoAlInquilino'),
        `${delInquilino[0]?.numero}–${delInquilino[delInquilino.length - 1]?.numero}`,
        delInquilino,
        'xl:grid-cols-6',
        'bg-fg-subtle',
      )}

      {/* El corte: acá la pelota pasa del inquilino a la inmobiliaria. Es lo
          más importante del mapa, por eso va dibujado y no sólo implícito. */}
      <div className="flex items-center gap-3" role="separator" data-corte>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-primary">
          <ArrowsLeftRight className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
          {t('inmobiliaria.recorrido.cambioDeManos')}
        </span>
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      {tramo(
        t('inmobiliaria.recorrido.teToca'),
        `${delaInmobiliaria[0]?.numero}–${delaInmobiliaria[delaInmobiliaria.length - 1]?.numero}`,
        delaInmobiliaria,
        'xl:grid-cols-5',
        'bg-primary',
      )}
    </div>
  )
}
