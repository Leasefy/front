'use client'

/**
 * CodeudoresTab — estudio de inquilino, vista de caso (zona CENTRO).
 *
 * Visión §11/§12: los codeudores asociados al estudio (cada uno con su propia
 * validación de identidad, ingresos y documentos). UX-only: el detalle real de
 * cada codeudor necesita un endpoint que todavía no existe → mostramos un
 * EMPTY-STATE con la estructura de ejemplo de cómo se verá una tarjeta de
 * codeudor (sin inventar datos ni endpoints).
 *
 * Si la decisión derivada en el front recomienda codeudor, lo señalamos con
 * una nota (eso SÍ viene del pipeline, vía decision.requiereCodeudor).
 */

import { UsersThree, type Icon } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { EmptyState } from '@/components/data-display/EmptyState'
import type { EstudioDecision, TenantScoringResult } from '@/lib/estudio/decision'

interface CodeudoresTabProps {
  /** decision.requiereCodeudor sale del pipeline (no inventado). */
  decision?: EstudioDecision
  result?: TenantScoringResult
}

const NS = 'inmobiliaria.ai.estudio'

/** Campos de ejemplo de una ficha de codeudor (estructura visual). */
const EJEMPLO_CAMPOS: { icon: Icon; labelKey: string; labelFb: string }[] = [
  {
    icon: UsersThree,
    labelKey: `${NS}.detalle.codeudores.ejemplo.identidad`,
    labelFb: 'Identidad',
  },
  {
    icon: UsersThree,
    labelKey: `${NS}.detalle.codeudores.ejemplo.ingresos`,
    labelFb: 'Ingresos',
  },
  {
    icon: UsersThree,
    labelKey: `${NS}.detalle.codeudores.ejemplo.documentos`,
    labelFb: 'Documentos',
  },
]

export function CodeudoresTab({ decision }: CodeudoresTabProps) {
  const { t } = useI18n()

  /** i18n con fallback — nunca muestra la clave cruda. */
  const tf = (key: string, fallback: string): string => {
    const r = t(key)
    return r === key ? fallback : r
  }

  const recomendado = decision?.requiereCodeudor === true

  return (
    <div className="space-y-5">
      {/* Nota de recomendación (esto SÍ viene del pipeline) */}
      {recomendado && (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
          <p className="text-sm text-warning-700 leading-snug">
            {tf(
              `${NS}.detalle.codeudores.recomendado`,
              'Este estudio mejoraría su viabilidad con un codeudor. Cuando se agregue, su validación aparecerá aquí.',
            )}
          </p>
        </div>
      )}

      <EmptyState
        icon={UsersThree}
        title={tf(`${NS}.detalle.codeudores.empty.title`, 'Aún no hay codeudores')}
        description={tf(
          `${NS}.detalle.codeudores.empty.description`,
          'Cuando este estudio incluya uno o más codeudores, verás aquí su validación de identidad, ingresos y documentos.',
        )}
      />

      {/* Estructura de ejemplo — cómo se verá una ficha de codeudor (sin datos reales) */}
      <section
        aria-label={tf(`${NS}.detalle.codeudores.ejemplo.title`, 'Ejemplo de una ficha de codeudor')}
        className="rounded-lg border border-border bg-card p-5"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">
          {tf(`${NS}.detalle.codeudores.ejemplo.title`, 'Ejemplo de una ficha de codeudor')}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center shrink-0">
            <UsersThree
              className="w-5 h-5 text-fg-subtle"
              weight="duotone"
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg-subtle">
              {tf(`${NS}.detalle.codeudores.ejemplo.nombre`, 'Nombre del codeudor')}
            </p>
            <p className="text-xs text-fg-subtle tabular-nums">
              {tf(`${NS}.detalle.codeudores.ejemplo.documento`, 'C.C. — · — · —')}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EJEMPLO_CAMPOS.map((c) => {
            const CIcon = c.icon
            return (
              <div
                key={c.labelKey}
                className="rounded-lg border border-border bg-surface-muted p-3"
              >
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  <CIcon className="w-3.5 h-3.5" weight="duotone" aria-hidden="true" />
                  {tf(c.labelKey, c.labelFb)}
                </dt>
                <dd className="mt-1 text-sm text-fg-subtle">—</dd>
              </div>
            )
          })}
        </dl>
        <p className="mt-4 text-xs text-fg-subtle leading-snug">
          {tf(
            `${NS}.detalle.codeudores.ejemplo.nota`,
            'Estructura ilustrativa. Cada codeudor real traerá su propia validación completa cuando esté disponible.',
          )}
        </p>
      </section>
    </div>
  )
}
