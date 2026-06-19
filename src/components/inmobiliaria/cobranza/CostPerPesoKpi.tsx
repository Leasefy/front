'use client';

/**
 * CostPerPesoKpi — Phase 37 plan 37-10
 *
 * Hero KPI strip showing the cost-per-peso ratio (USD per COP recovered)
 * plus a 90-day daily sparkline using Recharts.
 *
 * Three render branches:
 *   A — agency-gate: returns null (page-level gate displays the badge)
 *   B — insufficient-data: SampleDataWatermark wraps stub ratio + stub sparkline
 *   C — populated=true: real data ratio + real sparkline
 *
 * Field names conform to backend canonical shape (37-SCHEMA-ALIGNMENT.md §6):
 *   cost_per_peso, sparkline_90d[{day, cost_per_peso}]
 */

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { useI18n } from '@/lib/i18n';
import { SampleDataWatermark } from '@/components/data-display/SampleDataWatermark';
import { STUB_COST_PER_PESO } from '@/lib/fixtures/cobranza-analytics-stub';

// ─── Type ─────────────────────────────────────────────────────────────────────

type CostPerPesoResponse = {
  populated: boolean;
  reason?: 'agency-gate' | 'insufficient-data';
  cost_per_peso?: number | null;
  numerator_usd_voice?: number | null;
  denominator_cop_paid?: number | null;
  sparkline_90d?: Array<{
    day: string;                   // ISO date 'YYYY-MM-DD'
    cost_per_peso: number | null;
  }>;
};

interface CostPerPesoKpiProps {
  data: CostPerPesoResponse | null;
  isLoading?: boolean;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const copFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const tooltipFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
});

// ─── Component ────────────────────────────────────────────────────────────────

export function CostPerPesoKpi({ data, isLoading }: CostPerPesoKpiProps) {
  const { t } = useI18n();

  // Loading skeleton
  if (isLoading) {
    return <div className="animate-pulse h-32 bg-neutral-100 dark:bg-neutral-800 rounded-md" />;
  }

  // Branch A — agency-gate: return null, page handles the display
  if (!data || (data.populated === false && data.reason === 'agency-gate')) {
    return null;
  }

  // Determine source data for ratio + sparkline
  const isStub = data.populated === false && data.reason === 'insufficient-data';
  const ratioValue = isStub
    ? (STUB_COST_PER_PESO.cost_per_peso ?? 0.041)
    : (data.cost_per_peso ?? 0);
  const sparklineData = isStub
    ? (STUB_COST_PER_PESO.sparkline_90d ?? [])
    : (data.sparkline_90d ?? []);

  // Format: "$X.XX USD por $1.000.000 COP"
  const formattedUsd = usdFmt.format(ratioValue);
  const formattedCop = copFmt.format(1_000_000);

  const chart = (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={sparklineData}>
        <XAxis dataKey="day" hide={true} />
        <YAxis hide={true} />
        <Line
          type="monotone"
          dataKey="cost_per_peso"
          stroke="#1A40FF"
          dot={false}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(val: unknown) => [
            tooltipFmt.format(Number(val)),
            t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.sparklineLabel'),
          ]}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.title')}
      className="relative"
    >
      <SampleDataWatermark show={isStub}>
        <p className="text-3xl font-bold tabular-nums">
          {formattedUsd}{' '}
          <span className="text-base font-normal text-neutral-500">por</span>{' '}
          {formattedCop}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 mb-3">
          {t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.subtitle')}
        </p>
        {chart}
      </SampleDataWatermark>
    </section>
  );
}
