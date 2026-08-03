'use client'

/*
 * TopScriptsTable — Phase 38 plan 38-04a (D-38-14 frontend half).
 *
 * Three branches keyed on `data.populated`:
 *
 *  1. `data === undefined` → fallback NoDataYetBadge (hook still settling or
 *     parent forgot to pass data). The widget never crashes on a missing prop.
 *
 *  2. `data.populated === false` → EmptyState (honest empty). Never renders
 *     fake/stub rows — if the agent has no real script data, we say so.
 *
 *  3. `data.populated === true` → real table with columns Script / Etapa /
 *     Llamadas / Tasa conv. / Lift / Tendencia 30d.
 *
 * The widget receives data via prop so analitica/page.tsx stays the single
 * data owner (consistent with other Phase 37 widgets).
 */

import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { EmptyState } from '@/components/data-display/EmptyState'
import { FileText } from '@phosphor-icons/react'
import type {
  TopScriptsData,
  TopScriptsRow,
} from '@/lib/hooks/cobranza/use-cobranza-analytics'

interface TopScriptsTableProps {
  data: TopScriptsData | undefined
}

export function TopScriptsTable({ data }: TopScriptsTableProps): JSX.Element {
  const { t } = useI18n()

  // Branch 1: undefined → fallback NoDataYetBadge (hook still settling).
  if (data === undefined) {
    return (
      <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
          {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
        </h3>
        <NoDataYetBadge
          phase={38}
          reason={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.pendingPhase38')}
        />
      </section>
    )
  }

  // Branch 2: populated false → EmptyState (no mock data)
  if (!data.populated) {
    return (
      <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
          {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
        </h3>
        <EmptyState
          icon={FileText}
          title={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
          description="Sin datos suficientes todavía"
        />
      </section>
    )
  }

  // Branch 3: populated true → real rows
  const rows: TopScriptsRow[] = data.rows

  return (
    <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
      </h3>
      <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-neutral-500 dark:text-neutral-400">
              <th className="text-left px-3 py-2 font-medium">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.script')}
              </th>
              <th className="text-left px-3 py-2 font-medium">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.stage')}
              </th>
              <th className="text-right px-3 py-2 font-medium">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.nCalls')}
              </th>
              <th className="text-right px-3 py-2 font-medium">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.conversionRate')}
              </th>
              <th className="text-right px-3 py-2 font-medium">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.lift')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.scriptTemplateId}
                className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
              >
                <td className="px-3 py-2 text-neutral-900 dark:text-white">
                  {row.scriptName}
                </td>
                <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 font-semibold">
                  {row.stage}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                  {row.nCalls}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                  {(row.conversionRate * 100).toFixed(1)}%
                </td>
                <td
                  className={
                    'px-3 py-2 text-right tabular-nums font-medium ' +
                    (row.lift >= 1
                      ? 'text-success'
                      : 'text-warning')
                  }
                >
                  {row.lift >= 0 ? '+' : ''}
                  {((row.lift - 1) * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
