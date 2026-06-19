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
import { MigaDePan } from '@/components/inmobiliaria/ai/MigaDePan'
import { PageSkeleton } from '@/components/skeleton/panel/PageSkeleton'

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
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <MigaDePan
          backHref="/panel/inmobiliaria/ai/cobranza/reporte"
          crumbs={[
            { label: t('inmobiliaria.nav.secAgentes'), href: '/panel/inmobiliaria/ai' },
            { label: t('inmobiliaria.ai.workspace.agente.cobranza'), href: '/panel/inmobiliaria/ai/cobranza' },
            { label: t('inmobiliaria.ai.cobranza.reporte.pageTitle'), href: '/panel/inmobiliaria/ai/cobranza/reporte' },
            { label: t('inmobiliaria.ai.cobranza.reporte.thresholds.pageTitle') },
          ]}
        />
        <h1 className="text-h2 font-heading text-foreground mt-2">
          {t('inmobiliaria.ai.cobranza.reporte.thresholds.pageTitle')}
        </h1>
        {active?.version != null && (
          <p className="mt-1 text-xs font-mono tabular-nums text-muted-foreground">
            {locale.startsWith('es') ? 'Versión vigente' : 'Active version'}: v
            {active.version}
          </p>
        )}
      </div>

      {/* Phase 38-05a: PageSkeleton primitive (list variant) replaces inline
         spinner. No page-level EmptyState — the threshold editor always
         renders a form (defaults are seeded server-side on first access), so
         a "no thresholds" state never surfaces. See SUMMARY deviations. */}
      {isLoading && !active && <PageSkeleton variant="list" />}

      {error && (
        <div className="rounded-xl bg-danger-soft text-danger">
          Error: {error}
        </div>
      )}

      {active && (
        <>
          <ThresholdEditor
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
