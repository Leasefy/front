'use client'

/**
 * AseguradorasConPrima — la lista de aseguradoras del pre-scoring (Slice 2),
 * con la prima mensual por aseguradora.
 *
 * Hermana de `AseguradorasQueTeRespaldan` (mismo lenguaje visual: tarjeta con
 * monograma, las que respaldan primero, el color dice una sola cosa), pero
 * consume el shape rico de `PreScoringCarrier` en vez del veredicto simple
 * `{ nombre, aprobada }`. No se reutilizó el mismo componente porque las
 * reglas de qué mostrar son distintas: acá hay prima mensual, motivo de
 * rechazo y una marca de demo por aseguradora — datos que el veredicto simple
 * no tiene.
 *
 * ⚠️ Regla dura: sin `primaMensualCop` no se muestra ningún monto, ni
 * siquiera "$ 0". Ver `docs/scoring-domain` — un número inventado manda a
 * alguien a postularse a algo que no puede pagar.
 */

import { CheckCircle, ShieldCheck, Sparkle } from '@phosphor-icons/react'

import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { marcaDe } from '@/lib/aseguradoras/marca'
import type { PreScoringCarrier } from '@/lib/api/prescoring.types'

export interface AseguradorasConPrimaProps {
  carriers: readonly PreScoringCarrier[]
  locale?: 'es' | 'en'
  className?: string
}

export function AseguradorasConPrima({ carriers, locale, className }: AseguradorasConPrimaProps) {
  if (carriers.length === 0) return null

  // Las que respaldan van primero — la buena noticia adelante. Dentro de cada
  // grupo se conserva el orden que mandó el backend.
  const ordenadas = [...carriers].sort((a, b) => Number(b.viable) - Number(a.viable))
  const respaldan = carriers.filter((c) => c.viable).length
  const total = carriers.length

  return (
    <section
      className={cn('rounded-lg border border-border bg-surface p-6 sm:p-8', className)}
      data-testid="aseguradoras-prima"
    >
      <header className="space-y-2">
        <p className="font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle">
          Tu respaldo
        </p>
        <h2 className="text-h3 font-semibold tracking-tight text-fg">
          {respaldan === 0 ? (
            <>Ninguna te respalda todavía</>
          ) : total === 1 ? (
            <>Una aseguradora te respalda</>
          ) : (
            <>
              <span className="font-mono tabular-nums">{respaldan}</span> de{' '}
              <span className="font-mono tabular-nums">{total}</span> aseguradoras te respaldan
            </>
          )}
        </h2>
        <p className="text-body-sm leading-relaxed text-fg-muted">
          {total === 1
            ? 'Con que una diga que sí, ya te puedes postular.'
            : 'Le preguntamos a todas con las que trabajamos, no solo a una. Con que una diga que sí, ya te puedes postular.'}
        </p>
      </header>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ordenadas.map((c) => (
          <TarjetaCarrier key={c.name} carrier={c} locale={locale} />
        ))}
      </ul>

      <p className="mt-5 flex items-center gap-2 border-t border-faint pt-4 text-caption text-fg-subtle">
        <ShieldCheck className="h-4 w-4 shrink-0" weight="duotone" aria-hidden="true" />
        El respaldo lo emite la aseguradora, no Leasefy.
      </p>
    </section>
  )
}

function TarjetaCarrier({
  carrier,
  locale,
}: {
  carrier: PreScoringCarrier
  locale?: 'es' | 'en'
}) {
  const { iniciales, logo } = marcaDe(carrier.name)
  const respalda = carrier.viable
  const testId = `carrier-${carrier.name.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <li
      className={cn(
        'group relative flex items-center gap-3.5 rounded-md border p-3.5',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out',
        respalda
          ? 'border-border bg-surface hover:-translate-y-0.5 hover:shadow-md'
          : 'border-faint bg-surface-muted',
      )}
      data-testid={testId}
    >
      <div
        className={cn(
          'flex h-11 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden',
          'rounded-md border border-faint bg-white p-1.5',
        )}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- SVG de marca; next/image no aporta acá
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            className={cn('max-h-full max-w-full object-contain', !respalda && 'opacity-45 grayscale')}
          />
        ) : (
          <span
            className={cn(
              'font-mono text-body-sm font-semibold tracking-[0.06em]',
              respalda ? 'text-primary' : 'text-fg-subtle',
            )}
            aria-hidden="true"
          >
            {iniciales}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn('truncate text-body-sm font-medium', respalda ? 'text-fg' : 'text-fg-muted')}>
            {carrier.name}
          </p>
          {/* Demo: no es cotización real. Hoy solo Fianly corre en modo real. */}
          {carrier.stubMode && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/25 bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning"
              data-testid="badge-demo"
            >
              <Sparkle className="h-2.5 w-2.5" weight="fill" aria-hidden="true" />
              Demo
            </span>
          )}
        </div>

        {respalda ? (
          <p className="font-mono text-body-sm tabular-nums text-success">
            {carrier.primaMensualCop !== null
              ? `${formatCurrency(carrier.primaMensualCop, locale)}/mes`
              : 'Te respalda'}
          </p>
        ) : (
          <p className="text-caption text-fg-subtle">{carrier.motivoRechazo ?? 'Esta vez no'}</p>
        )}
      </div>

      {respalda && <CheckCircle className="h-5 w-5 shrink-0 text-success" weight="fill" aria-hidden="true" />}
    </li>
  )
}
