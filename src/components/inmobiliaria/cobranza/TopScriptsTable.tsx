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

import { useMemo, type JSX } from 'react'
import { useI18n } from '@/lib/i18n'
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge'
import { EmptyState } from '@/components/data-display/EmptyState'
import { FileText } from '@phosphor-icons/react'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type {
  TopScriptsData,
  TopScriptsRow,
} from '@/lib/hooks/cobranza/use-cobranza-analytics'
import { useOrdenDeLaTabla } from '@/lib/hooks/use-orden-de-la-tabla'
import { EncabezadoOrdenable } from '@/components/ui/encabezado-ordenable'

interface TopScriptsTableProps {
  data: TopScriptsData | undefined
}

export function TopScriptsTable({ data }: TopScriptsTableProps): JSX.Element {
  const { t } = useI18n()

  // Nico 28-10: «que todas las tablas tengan lo de ordenamiento general y por columnas». Antes de las salidas
  // tempranas (es un hook); sin orden elegido queda el del back.
  const filas = useMemo<TopScriptsRow[]>(() => (data?.populated ? data.rows : []), [data])
  const { ordenadas, orden, ordenarPor } = useOrdenDeLaTabla(
    filas,
    {
      script: (r) => r.scriptName,
      etapa: (r) => r.stage,
      llamadas: (r) => r.nCalls,
      conversion: (r) => r.conversionRate,
      lift: (r) => r.lift,
    },
    { primero: { llamadas: 'desc', conversion: 'desc', lift: 'desc' } },
  )

  // Branch 1: undefined → fallback NoDataYetBadge (hook still settling).
  if (data === undefined) {
    return (
      <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
        <h3 className="text-sm font-medium text-fg-muted mb-3">
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
        <h3 className="text-sm font-medium text-fg-muted mb-3">
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
  const rows: TopScriptsRow[] = ordenadas

  return (
    <section aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}>
      <h3 className="text-sm font-medium text-fg-muted mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.title')}
      </h3>
      {/* `overflow-hidden` recorta las esquinas redondeadas; el scroll horizontal
          lo pone el `Table` del DS en su propio contenedor. */}
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <Table>
          <TableHeader>
            {/* El encabezado no es una fila sobre la que se pueda actuar: sin hover. */}
            <TableRow className="hover:bg-transparent">
              <EncabezadoOrdenable campo="script" orden={orden} onOrdenar={ordenarPor} className="px-3">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.script')}
              </EncabezadoOrdenable>
              <EncabezadoOrdenable campo="etapa" orden={orden} onOrdenar={ordenarPor} className="px-3">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.stage')}
              </EncabezadoOrdenable>
              <EncabezadoOrdenable campo="llamadas" orden={orden} onOrdenar={ordenarPor} className="px-3 text-right" alineacion="derecha">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.nCalls')}
              </EncabezadoOrdenable>
              <EncabezadoOrdenable campo="conversion" orden={orden} onOrdenar={ordenarPor} className="px-3 text-right" alineacion="derecha">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.conversionRate')}
              </EncabezadoOrdenable>
              <EncabezadoOrdenable campo="lift" orden={orden} onOrdenar={ordenarPor} className="px-3 text-right" alineacion="derecha">
                {t('inmobiliaria.ai.cobranza.analitica.widgets.topScripts.column.lift')}
              </EncabezadoOrdenable>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.scriptTemplateId}>
                <TableCell className="px-3">{row.scriptName}</TableCell>
                <TableCell className="px-3 font-medium text-fg-muted">{row.stage}</TableCell>
                <TableCell numeric className="px-3 font-mono text-fg-muted">
                  {row.nCalls}
                </TableCell>
                <TableCell numeric className="px-3 font-mono text-fg-muted">
                  {(row.conversionRate * 100).toFixed(1)}%
                </TableCell>
                <TableCell
                  numeric
                  className={
                    'px-3 font-mono font-medium ' +
                    (row.lift >= 1 ? 'text-success' : 'text-warning')
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
    </section>
  )
}
