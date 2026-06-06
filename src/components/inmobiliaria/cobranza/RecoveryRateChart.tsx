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
 *   B — insufficient-buckets or other populated=false → SampleDataWatermark + stub chart
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
import { NoDataYetBadge } from '@/components/data-display/no-data-yet-badge';
import { SampleDataWatermark } from '@/components/data-display/SampleDataWatermark';
import { STUB_RECOVERY_RATE } from '@/lib/fixtures/cobranza-analytics-stub';

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
  S0: '#3b82f6', // blue-500
  S1: '#6366f1', // indigo-500
  S2: '#8b5cf6', // violet-500
  S3: '#ec4899', // pink-500
  S4: '#f97316', // orange-500
  S5: '#f43f5e', // rose-500
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

  // Branch B / C — stub or real data
  const sourceRows: RecoveryRateRow[] = data.populated ? data.rows : STUB_RECOVERY_RATE.rows;
  const showWatermark = !data.populated;

  const stages = Array.from(new Set(sourceRows.map((r) => r.stage))).sort();
  const pivotedData = pivotRows(sourceRows);

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
      <SampleDataWatermark show={showWatermark}>
        {chart}
      </SampleDataWatermark>
    </div>
  );
}
