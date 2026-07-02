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
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">
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
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.title')}
      </p>
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700">
            <th className="pb-2 w-8 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide">
              #
            </th>
            <th className="pb-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.literal')}
            </th>
            <th className="pb-2 pr-4 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide text-right">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.count')}
            </th>
            <th className="pb-2 font-medium text-neutral-600 dark:text-neutral-400 text-xs uppercase tracking-wide text-right">
              {t('inmobiliaria.ai.cobranza.analitica.widgets.topObjections.column.pct')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row) => (
            <tr
              key={row.rank}
              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
            >
              <td className="py-2.5 pr-2 text-xs text-neutral-400 tabular-nums">{row.rank}</td>
              <td className="py-2.5 pr-4 text-neutral-800 dark:text-neutral-200 max-w-[220px] truncate">
                {row.literal}
              </td>
              <td className="py-2.5 pr-4 text-right tabular-nums text-neutral-700 dark:text-neutral-300">
                {row.count.toLocaleString()}
              </td>
              <td className="py-2.5 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                {(row.pct * 100).toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
