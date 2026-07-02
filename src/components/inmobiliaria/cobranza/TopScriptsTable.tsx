'use client'

/*
 * TopScriptsTable — Phase 38 plan 38-04a (D-38-14 frontend half).
 *
 * Replaces the Phase 37 permanent stub (`NoDataYetBadge` always) with three
 * branches keyed on `data.populated`:
 *
 *  1. `data === undefined` → fallback NoDataYetBadge (hook still settling or
 *     parent forgot to pass data). Matches Phase 37 behavior so the widget
 *     never crashes on a missing prop.
 *
 *  2. `data.populated === false` → SampleDataWatermark wrapping a 3-row stub
 *     table. Same pattern as RecoveryRateChart / TopObjectionsTable in Phase 37
 *     (D-37-05 two-tier gate). The stub rows are hardcoded sample script names
 *     with no real operator data — see threat model T-38-04a-01.
 *
 *  3. `data.populated === true` → real table with columns Script / Etapa /
 *     Llamadas / Tasa conv. / Lift / Tendencia 30d.
 *
 * The widget receives data via prop so analitica/page.tsx stays the single
 * data owner (consistent with other Phase 37 widgets).
 */

import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { SampleDataWatermark } from '@/components/data-display/SampleDataWatermark'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  TopScriptsData,
  TopScriptsRow,
} from '@/lib/hooks/cobranza/use-cobranza-analytics'

// Stub rows used when `data.populated === false`. Hardcoded — no PII, no tenant
// data. SampleDataWatermark visually signals stub status (T-38-04a-01 mitigation).
const STUB_ROWS: TopScriptsRow[] = [
  {
    scriptTemplateId: 'stub-s0-welcome',
    scriptName: 'Script de bienvenida',
    stage: 'S0',
    nCalls: 42,
    conversionRate: 0.38,
    lift: 1.12,
  },
  {
    scriptTemplateId: 'stub-s1-reminder',
    scriptName: 'Recordatorio amable',
    stage: 'S1',
    nCalls: 28,
    conversionRate: 0.29,
    lift: 0.94,
  },
  {
    scriptTemplateId: 'stub-s3-proposal',
    scriptName: 'Propuesta de pago',
    stage: 'S3',
    nCalls: 15,
    conversionRate: 0.53,
    lift: 1.41,
  },
]

interface TopScriptsTableProps {
  data: TopScriptsData | undefined
}

export function TopScriptsTable({ data }: TopScriptsTableProps): JSX.Element {
  const { t } = useI18n()

  // Branch 1: undefined → fallback NoDataYetBadge (hook still settling).
  if (data === undefined) {
    return (
      <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
        <h3 className="text-sm font-semibold text-fg-muted mb-3">
          {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
        </h3>
        <NoDataYetBadge
          phase={38}
          reason={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.pendingPhase38')}
        />
      </section>
    )
  }

  // Branch 2 + 3: populated false → stub + watermark; populated true → real rows.
  const rows: TopScriptsRow[] = data.populated ? data.rows : STUB_ROWS
  const showWatermark = !data.populated

  return (
    <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
      <h3 className="text-sm font-semibold text-fg-muted mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
      </h3>
      <SampleDataWatermark show={showWatermark}>
        <div className="overflow-x-auto rounded-[18px] border border-border bg-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left px-3 py-2">
                  {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.script')}
                </TableHead>
                <TableHead className="text-left px-3 py-2">
                  {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.stage')}
                </TableHead>
                <TableHead className="text-right px-3 py-2">
                  {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.nCalls')}
                </TableHead>
                <TableHead className="text-right px-3 py-2">
                  {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.conversionRate')}
                </TableHead>
                <TableHead className="text-right px-3 py-2">
                  {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.lift')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.scriptTemplateId}
                  className="border-b border-border-faint hover:bg-surface-hover"
                >
                  <TableCell className="px-3 py-2 text-fg">
                    {row.scriptName}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-fg-muted font-semibold">
                    {row.stage}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-fg-muted">
                    {row.nCalls}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right font-mono tabular-nums text-fg-muted">
                    {(row.conversionRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell
                    className={
                      'px-3 py-2 text-right font-mono tabular-nums font-medium ' +
                      (row.lift >= 1
                        ? 'text-success'
                        : 'text-warning')
                    }
                  >
                    {row.lift >= 0 ? '+' : ''}
                    {((row.lift - 1) * 100).toFixed(0)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SampleDataWatermark>
    </section>
  )
}
