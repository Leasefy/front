'use client'

/**
 * Threshold Editor Page — Phase 34 plan 34-08.
 *
 * Admin-only route gated by `cobranza:edit-thresholds`. PageGuard's
 * `module + action` props route to the same `canAccess(module, action)`
 * check; non-admins redirect to `/panel/inmobiliaria` per existing pattern.
 *
 * Layout:
 *   1. Editor form (active row)
 *   2. Versions history table (with confirmation modal for rollback)
 *
 * Refs:
 *   34-05 SUMMARY (PUT + POST /rollback endpoints)
 *   34-CONTEXT.md (D-34-RES versioned thresholds rationale)
 *   mvp:docs/DESIGN.md §4 (card surfaces)
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { useI18n } from '@/lib/i18n'
import { useThresholds } from '@/lib/hooks/cobranza/use-thresholds'
import { ThresholdEditor } from '@/components/inmobiliaria/cobranza/ThresholdEditor'
import { ThresholdVersionsTable } from '@/components/inmobiliaria/cobranza/ThresholdVersionsTable'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'
import { CrossFade, Presence } from '@leasefy/cadence'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

function ThresholdsContent() {
  const { t, locale } = useI18n()
  const {
    active,
    versions,
    versionsListSupported,
    isLoading,
    error,
    updateThresholds,
    rollbackTo,
  } = useThresholds()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* MORI-23 (QA-AGENTES 16-10): la pantalla no decía para qué eran estas
          cifras ni dónde se ven. GLOW UP 21-10: el encabezado común, con la
          versión que rige junto al título. */}
      <EncabezadoDePantalla
        seccion="Cobranza"
        titulo={t('inmobiliaria.ai.cobranza.reporte.thresholds.pageTitle')}
        descripcion={
          locale.startsWith('es')
            ? 'Cuándo te avisa el Reporte diario —en la pantalla y en el correo— y cuántos deudores muestra. Cada cambio queda guardado como una versión y puedes volver a una anterior.'
            : 'When the Daily report warns you —on screen and by email— and how many debtors it shows. Every change is saved as a version you can go back to.'
        }
        junto={
          active?.version != null ? (
            <span className="text-caption text-fg-muted">
              {locale.startsWith('es') ? `Rige la versión ${active.version}` : `Version ${active.version} is active`}
            </span>
          ) : null
        }
      />

      {/* Phase 38-05a: PageSkeleton primitive (list variant) replaces inline
         spinner. No page-level EmptyState — the threshold editor always
         renders a form (defaults are seeded server-side on first access), so
         a "no thresholds" state never surfaces. See SUMMARY deviations. */}
      {/* Esqueleto → editor con su fundido (`CrossFade`); el error entra y
          sale con `Presence`. */}
      <CrossFade swapKey={isLoading && !active ? 'cargando' : active ? 'editor' : 'nada'} className="space-y-6">
      {isLoading && !active && <PageSkeleton variant="list" />}

      {/* `error` ya es la frase del traductor (antes: «Error: 500»). */}
      <Presence show={Boolean(error)} role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
      </Presence>

      {active && (
        <>
          {/* MORI-31: el editor toma sus valores al montar; con la versión de
              llave se vuelve a montar al restaurar (antes seguía mostrando los
              valores de la versión que se acababa de deshacer). */}
          <ThresholdEditor
            key={active.version ?? 'por-defecto'}
            active={active}
            onSubmit={async (body) => {
              const row = await updateThresholds(body)
              return { version: row.version }
            }}
          />

          <ThresholdVersionsTable
            versions={versions}
            supported={versionsListSupported}
            onRollback={async (version) => {
              const row = await rollbackTo(version)
              return { version: row.version }
            }}
          />
        </>
      )}
      </CrossFade>
    </div>
  )
}

export default function ThresholdsPage() {
  return (
    <PageGuard module="cobranza" action="edit-thresholds">
      <ThresholdsContent />
    </PageGuard>
  )
}
