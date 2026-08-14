'use client'

/**
 * /ai/asegurabilidad/comparar — "Comparador" de asegurabilidad (visión #13).
 *
 * Vista de comparación criterio × aseguradoras: una matriz que enfrenta a las
 * candidatas (Asegura candidato, Codeudor, Tiempo estimado, Costo estimado,
 * Documentos adicionales, Fricción, Recomendación) para decidir con quién
 * avanzar.
 *
 * No hay consulta en vivo en esta ruta, así que se renderiza como EMPTY-STATE
 * (con copy explicativo + CTA "Nueva consulta") sobre un PREVIEW de la tabla:
 * cabeceras de criterios + columnas de aseguradoras esqueleto, para que el
 * operador entienda qué verá al ejecutar una consulta. UX-only.
 */

import {
  GitDiff,
  ShieldCheck,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { MonoLabel } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { EmptyState } from '@/components/data-display/EmptyState'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'

const NS = 'inmobiliaria.ai.cotizador.comparar'
const NUEVA_HREF = '/panel/inmobiliaria/ai/asegurabilidad/nueva'

/** Los criterios (filas) que enfrentan a las aseguradoras candidatas. */
const CRITERIA: { icon: Icon; key: string; fallback: string }[] = [
  { icon: ShieldCheck, key: `${NS}.criteria.aseguraCandidato`, fallback: 'Asegura candidato' },
  { icon: ShieldCheck, key: `${NS}.criteria.codeudor`, fallback: 'Codeudor' },
  { icon: ShieldCheck, key: `${NS}.criteria.tiempoEstimado`, fallback: 'Tiempo estimado' },
  { icon: ShieldCheck, key: `${NS}.criteria.costoEstimado`, fallback: 'Costo estimado' },
  { icon: ShieldCheck, key: `${NS}.criteria.documentosAdicionales`, fallback: 'Documentos adicionales' },
  { icon: ShieldCheck, key: `${NS}.criteria.friccion`, fallback: 'Fricción' },
  { icon: ShieldCheck, key: `${NS}.criteria.recomendacion`, fallback: 'Recomendación' },
]

/** Tres columnas placeholder de aseguradoras para el preview. */
const PREVIEW_CARRIER_COLS = 3

function CompararView() {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          {tf(`${NS}.title`, 'Comparador')}
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-0.5 text-sm max-w-2xl">
          {tf(
            `${NS}.subtitle`,
            'Enfrenta a las aseguradoras candidatas criterio por criterio para decidir con cuál avanzar.',
          )}
        </p>
      </header>

      {/* Preview de la tabla criterio × aseguradoras (esqueleto, no datos) */}
      <section
        className="rounded-xl border border-border bg-card overflow-hidden"
        aria-label={tf(`${NS}.preview.aria`, 'Vista previa del comparador')}
      >
        {/* Empty-state explicativo encima del preview */}
        <div className="border-b border-border">
          <EmptyState
            icon={GitDiff}
            title={tf(`${NS}.empty.title`, 'Aún no hay nada que comparar')}
            description={tf(
              `${NS}.empty.description`,
              'El comparador se llena al ejecutar una consulta de asegurabilidad. Verás aquí, lado a lado, qué aseguradora aprueba al candidato, si exige codeudor, su tiempo y costo estimados, los documentos adicionales y la fricción del trámite.',
            )}
            primaryCta={{
              label: tf(`${NS}.empty.cta`, 'Nueva consulta'),
              href: NUEVA_HREF,
            }}
          />
        </div>

        {/* Esqueleto de la matriz: filas = criterios, columnas = aseguradoras */}
        <div className="px-5 pt-5 pb-2">
          <MonoLabel>
            {tf(`${NS}.preview.label`, 'Así se verá')}
          </MonoLabel>
        </div>
        <div className="overflow-x-auto overscroll-contain px-5 pb-5" aria-hidden="true">
          <Table className="min-w-full border-separate border-spacing-0">
            <TableHeader>
              <TableRow>
                {/* Esquina criterio × aseguradora */}
                <TableHead
                  scope="col"
                  className="sticky left-0 z-10 bg-card px-4 py-3 text-left border-b border-border min-w-[180px]"
                >
                  {tf(`${NS}.preview.criterioCol`, 'Criterio')}
                </TableHead>
                {Array.from({ length: PREVIEW_CARRIER_COLS }).map((_, i) => (
                  <TableHead
                    key={`carrier-${i}`}
                    scope="col"
                    className="px-4 py-3 text-center border-b border-border min-w-[150px]"
                  >
                    <span className="inline-flex flex-col items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <ShieldCheck
                          className="w-4 h-4 text-fg-subtle"
                          weight="duotone"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="h-2.5 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {CRITERIA.map((row, rowIdx) => {
                const RowIcon = row.icon
                const isLast = rowIdx === CRITERIA.length - 1
                return (
                  <TableRow key={row.key} className={isLast ? 'bg-neutral-50/60 dark:bg-neutral-800/30' : undefined}>
                    {/* Etiqueta del criterio (real, para que se entienda la matriz) */}
                    <TableHead
                      scope="row"
                      className="sticky left-0 z-10 bg-card px-4 py-3.5 text-left text-fg border-b border-border align-middle"
                    >
                      <span className="inline-flex items-center gap-2">
                        <RowIcon
                          className="w-4 h-4 shrink-0 text-fg-muted"
                          weight="duotone"
                          aria-hidden="true"
                        />
                        {tf(row.key, row.fallback)}
                      </span>
                    </TableHead>
                    {/* Celdas esqueleto por aseguradora */}
                    {Array.from({ length: PREVIEW_CARRIER_COLS }).map((_, colIdx) => (
                      <TableCell
                        key={`cell-${rowIdx}-${colIdx}`}
                        className="px-4 py-3.5 border-b border-border text-center"
                      >
                        <span
                          className="inline-block h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  )
}

export default function CompararPage() {
  return (
    <PageGuard module="cotizador">
      <CompararView />
    </PageGuard>
  )
}
