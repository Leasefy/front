'use client';

/**
 * TopObjectionsTable — Phase 37 plan 37-08
 *
 * Top-10 objections table showing rank, literal, count, and % of calls.
 *
 * Three render branches:
 *   A — agency-gate → return null (page-level NoDataYetBadge handles it)
 *   B — populated=false → EmptyState (honest empty, never fake rows)
 *   C — populated=true → real objections data
 *
 * Security note (T-37-08-01): row.literal is plain text rendered via React
 * (auto-escaped). No dangerouslySetInnerHTML is used. Server-side PII regex
 * strip is applied in 37-04 endpoint before data reaches this component.
 *
 * pct field comes as 0..1 from the backend/fixture — multiply by 100 for display.
 */

import { ChatTeardropDots } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { EmptyState } from '@/components/data-display/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ─── Type Definitions ─────────────────────────────────────────────────────────

type ObjectionRow = {
  rank: number;
  literal: string;
  count: number;
  pct: number; // 0..1 share of calls
};

type TopObjectionsResponse = {
  populated: boolean;
  reason?: string;
  objections: ObjectionRow[];
};

interface TopObjectionsTableProps {
  data: TopObjectionsResponse;
  locale?: 'es' | 'en';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TopObjectionsTable({ data }: TopObjectionsTableProps) {
  const { t } = useI18n();

  // Branch A — agency-gate: page-level handles empty state
  if (!data.populated && data.reason === 'agency-gate') {
    return null;
  }

  // Branch B — no real data yet
  if (!data.populated) {
    return (
      <div className="relative overflow-x-auto">
        <p className="text-xs font-medium text-fg-muted mb-3">
          {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
        </p>
        <EmptyState
          icon={ChatTeardropDots}
          title={t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
          description="Sin datos suficientes todavía"
        />
      </div>
    );
  }

  // Branch C — real data
  const rows = data.objections.slice(0, 10);

  return (
    // Sin `overflow-x-auto` acá: el `Table` del DS ya trae su propio contenedor
    // de scroll horizontal, y dos anidados dejan uno inerte.
    <div className="relative">
      <p className="text-xs font-medium text-fg-muted mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
      </p>
      <Table>
        <TableHeader>
          {/* El encabezado no es una fila sobre la que se pueda actuar: sin hover. */}
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col" className="w-8">
              #
            </TableHead>
            <TableHead scope="col">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.literal')}
            </TableHead>
            <TableHead scope="col" numeric>
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.count')}
            </TableHead>
            <TableHead scope="col" numeric>
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.pct')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.rank}>
              <TableCell className="font-mono text-xs tabular-nums text-fg-subtle">
                {row.rank}
              </TableCell>
              <TableCell className="max-w-[220px] truncate">{row.literal}</TableCell>
              <TableCell numeric className="font-mono text-fg-muted">
                {row.count.toLocaleString()}
              </TableCell>
              <TableCell numeric className="font-mono text-fg-muted">
                {(row.pct * 100).toFixed(1)}%
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
