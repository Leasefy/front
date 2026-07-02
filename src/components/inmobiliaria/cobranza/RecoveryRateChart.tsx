'use client';

/**
 * RecoveryRateChart — Phase 37 plan 37-08
 *
 * Dual-axis line chart showing recovery rate by stage over time.
 * Left y-axis: pct_n (debtor count recovery %)
 * Right y-axis: pct_cop (COP value recovery %)
 *
 * Three render branches:
 *   A — agency-gate → NoDataYetBadge
 *   B — insufficient-buckets or other populated=false → EmptyState (honest empty, never stub chart)
 *   C — populated=true → real data chart
 *
 * D-37-01: Dual-axis single LineChart layout (pct_n left, pct_cop right) is
 * an intentional planner choice to minimize vertical space on the analytics page.
 * The alternative (two separate charts) was rejected.
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useI18n } from '@/lib/i18n';
import { ChartLine } from '@phosphor-icons/react';
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge';
import { EmptyState } from '@/components/data-display/EmptyState';

// ─── Type Definitions ─────────────────────────────────────────────────────────

type RecoveryRateRow = {
  bucket_date: string;            // ISO date 'YYYY-MM-DD'
  stage: string;
  pct_n: number;                  // 0..1 PRE-COMPUTED by backend
  pct_cop: number;                // 0..1 PRE-COMPUTED by backend
  debtors_recovered_count: number;
  debtors_in_stage_count: number;
  recovered_cop: string | number;
  total_cop_in_stage: string | number;
};

type RecoveryRateResponse = {
  populated: boolean;
  reason?: string;
  rows: RecoveryRateRow[];
};

interface RecoveryRateChartProps {
  data: RecoveryRateResponse;
  locale?: 'es' | 'en';
}

// ─── Stage Colors ─────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  S0: '#1A40FF', // electric-blue (primary)
  S1: '#8A9CFF', // blue-tint
  S2: '#6B6B6B', // neutral-mid
  S3: '#9B9B9B', // neutral-light
  S4: '#C9CDD3', // neutral-pale
  S5: '#C4503B', // semantic red (highest severity stage)
};

// ─── Pivot Helper ─────────────────────────────────────────────────────────────
// Groups rows by bucket_date so each x-axis tick has all stage values.
// Produces: { bucket_date, S0_pct_n, S0_pct_cop, S1_pct_n, ... }

type PivotedRow = Record<string, string | number>;

function pivotRows(rows: RecoveryRateRow[]): PivotedRow[] {
  const byDate = new Map<string, PivotedRow>();
  for (const row of rows) {
    const existing = byDate.get(row.bucket_date) ?? { bucket_date: row.bucket_date };
    existing[`${row.stage}_pct_n`] = row.pct_n;
    existing[`${row.stage}_pct_cop`] = row.pct_cop;
    byDate.set(row.bucket_date, existing);
  }
  return Array.from(byDate.values()).sort((a, b) =>
    String(a.bucket_date).localeCompare(String(b.bucket_date))
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecoveryRateChart({ data }: RecoveryRateChartProps) {
  const { t } = useI18n();

  // Branch A — agency-gate: full empty-state badge
  if (!data.populated && data.reason === 'agency-gate') {
    return (
      <NoDataYetBadge
        phase={37}
        reason={t('inmobiliaria.ai.cobranza.analitica.agencyGate.reason')}
        cta={t('inmobiliaria.ai.cobranza.analitica.agencyGate.ctaLabel')}
        ctaHref="/panel/inmobiliaria/ai/cobranza"
      />
    );
  }

  // Branch B — no real data yet
  if (!data.populated) {
    return (
      <EmptyState
        icon={ChartLine}
        title={t('inmobiliaria.ai.cobranza.analitica.widgets.recoveryRate.title')}
        description="Sin datos suficientes todavía"
      />
    );
  }

  // Branch C — real data
  const stages = Array.from(new Set(data.rows.map((r) => r.stage))).sort();
  const pivotedData = pivotRows(data.rows);

  const chart = (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={pivotedData}>
        <XAxis dataKey="bucket_date" tick={{ fontSize: 10 }} />
        <YAxis
          yAxisId="left"
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          tick={{ fontSize: 10 }}
        />
        <Tooltip />
        <Legend />
        {stages.map((stage) => (
          <>
            <Line
              key={`${stage}-n`}
              yAxisId="left"
              type="monotone"
              dataKey={`${stage}_pct_n`}
              stroke={STAGE_COLORS[stage] ?? '#94a3b8'}
              dot={false}
              strokeWidth={1.5}
              name={`${stage} ${t('inmobiliaria.ai.cobranza.analitica.widgets.recoveryRate.legend.transitions')}`}
            />
            <Line
              key={`${stage}-cop`}
              yAxisId="right"
              type="monotone"
              dataKey={`${stage}_pct_cop`}
              stroke={STAGE_COLORS[stage] ?? '#94a3b8'}
              dot={false}
              strokeWidth={1}
              strokeDasharray="4 2"
              name={`${stage} ${t('inmobiliaria.ai.cobranza.analitica.widgets.recoveryRate.legend.cop')}`}
            />
          </>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.recoveryRate.title')}
      </p>
      {chart}
    </div>
  );
}
