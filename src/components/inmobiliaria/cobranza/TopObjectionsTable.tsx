'use client';

/**
 * TopObjectionsTable — Phase 37 plan 37-08
 *
 * Top-10 objections table showing rank, literal, count, and % of calls.
 *
 * Three render branches:
 *   A — agency-gate → return null (page-level NoDataYetBadge handles it)
 *   B — populated=false + other reason → SampleDataWatermark + stub rows
 *   C — populated=true → real objections data
 *
 * Security note (T-37-08-01): row.literal is plain text rendered via React
 * (auto-escaped). No dangerouslySetInnerHTML is used. Server-side PII regex
 * strip is applied in 37-04 endpoint before data reaches this component.
 *
 * pct field comes as 0..1 from the backend/fixture — multiply by 100 for display.
 */

import { useI18n } from '@/lib/i18n';
import { SampleDataWatermark } from '@/components/data-display/SampleDataWatermark';
import { STUB_TOP_OBJECTIONS } from '@/lib/fixtures/cobranza-analytics-stub';
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

  // Branch B / C — stub or real data
  const rows = data.populated
    ? data.objections.slice(0, 10)
    : STUB_TOP_OBJECTIONS.objections.slice(0, 10);
  const showWatermark = !data.populated;

  const table = (
    <Table className="text-left">
      <TableHeader>
        <TableRow className="border-b border-border">
          <TableHead className="pb-2 w-8">#</TableHead>
          <TableHead className="pb-2 pr-4">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.literal')}
          </TableHead>
          <TableHead className="pb-2 pr-4 text-right">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.count')}
          </TableHead>
          <TableHead className="pb-2 text-right">
            {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.pct')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-border-faint">
        {rows.map((row) => (
          <TableRow
            key={row.rank}
            className="hover:bg-surface-hover transition-colors"
          >
            <TableCell className="py-2.5 pr-2 text-xs text-fg-subtle font-mono tabular-nums">{row.rank}</TableCell>
            <TableCell className="py-2.5 pr-4 text-fg max-w-[220px] truncate">
              {row.literal}
            </TableCell>
            <TableCell className="py-2.5 pr-4 text-right font-mono tabular-nums text-fg-muted">
              {row.count.toLocaleString()}
            </TableCell>
            <TableCell className="py-2.5 text-right font-mono tabular-nums text-fg-subtle">
              {(row.pct * 100).toFixed(1)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="relative overflow-x-auto">
      <p className="text-xs font-medium text-fg-subtle mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
      </p>
      <SampleDataWatermark show={showWatermark}>
        {table}
      </SampleDataWatermark>
    </div>
  );
}
