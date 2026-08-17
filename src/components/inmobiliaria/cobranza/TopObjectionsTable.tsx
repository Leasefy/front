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
    <div className="relative overflow-x-auto">
      <p className="text-xs font-medium text-fg-muted mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
      </p>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-border">
            {/*
              Tabla suelta: ya iba en mayúsculas pero en sans 12px. Se alinea al
              encabezado del DS (`TableHead`): mono 11px, tracking 0.04em,
              fg-subtle.
            */}
            <th className="pb-2 w-8 font-mono text-[11px] uppercase tracking-[0.04em] text-fg-subtle">
              #
            </th>
            <th className="pb-2 pr-4 font-mono text-[11px] uppercase tracking-[0.04em] text-fg-subtle">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.literal')}
            </th>
            <th className="pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-[0.04em] text-fg-subtle">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.count')}
            </th>
            <th className="pb-2 text-right font-mono text-[11px] uppercase tracking-[0.04em] text-fg-subtle">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.pct')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-faint">
          {rows.map((row) => (
            <tr
              key={row.rank}
              className="hover:bg-surface-muted transition-colors"
            >
              <td className="py-2.5 pr-2 text-xs text-fg-subtle tabular-nums">{row.rank}</td>
              <td className="py-2.5 pr-4 text-fg max-w-[220px] truncate">
                {row.literal}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-fg-muted">
                {row.count.toLocaleString()}
              </td>
              <td className="py-2.5 text-right tabular-nums text-fg-muted">
                {(row.pct * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
