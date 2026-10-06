'use client';

/**
 * CostPerPesoKpi — Phase 37 plan 37-10
 *
 * Hero KPI strip showing the cost-per-peso ratio (USD per COP recovered)
 * plus a 90-day daily sparkline using Recharts.
 *
 * Three render branches:
 *   A — agency-gate: returns null (page-level gate displays the badge)
 *   B — insufficient-data: EmptyState (honest empty, never stub ratio/sparkline)
 *   C — populated=true: real data ratio + real sparkline
 *
 * Field names conform to backend canonical shape (37-SCHEMA-ALIGNMENT.md §6):
 *   cost_per_peso, sparkline_90d[{day, cost_per_peso}]
 */

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { CurrencyDollar } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { EmptyState } from '@/components/data-display/EmptyState';

// ─── Type ─────────────────────────────────────────────────────────────────────

type CostPerPesoResponse = {
  populated: boolean;
  reason?: 'agency-gate' | 'insufficient-data';
  cost_per_peso?: number | null;
  /** 🔴 En pesos (Nico, 04-10-2026). */
  numerator_cop_voice?: number | null;
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

/*
 * 🔴 TODO EN PESOS (Nico, 04-10-2026: «¿para qué manejar dólares?»). El back
 * manda `cost_per_peso` como pesos gastados en voz por cada peso recuperado
 * (los dos lados en COP): se dice «$ X por cada $ 1.000.000 recuperados».
 * Antes se pintaba ese cociente como dólares («US$0.01 por $1.000.000»).
 */
const copFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Pesos de voz por cada millón recuperado. */
const porMillon = (ratio: number): string => copFmt.format(ratio * 1_000_000);

// ─── Component ────────────────────────────────────────────────────────────────

export function CostPerPesoKpi({ data, isLoading }: CostPerPesoKpiProps) {
  const { t } = useI18n();

  // Loading skeleton
  if (isLoading) {
    return <div className="animate-pulse h-32 bg-surface-muted rounded-md" />;
  }

  // Branch A — agency-gate: return null, page handles the display
  if (!data || (data.populated === false && data.reason === 'agency-gate')) {
    return null;
  }

  // Branch B — no real data yet
  if (data.populated === false && data.reason === 'insufficient-data') {
    return (
      <EmptyState
        icon={CurrencyDollar}
        title={t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.title')}
        description="Sin datos suficientes todavía"
      />
    );
  }

  // Branch C — real data
  const ratioValue = data.cost_per_peso ?? 0;
  const sparklineData = data.sparkline_90d ?? [];

  // «$ X por cada $ 1.000.000 recuperados», todo en pesos.
  const formattedCosto = porMillon(ratioValue);
  const formattedCop = copFmt.format(1_000_000);

  return (
    <section
      aria-label={t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.title')}
      className="relative"
    >
      <p className="text-3xl font-bold tabular-nums">
        {formattedCosto}{' '}
        <span className="text-base font-normal text-fg-muted">por cada</span>{' '}
        {formattedCop}
      </p>
      <p className="text-xs text-fg-muted mt-1 mb-3">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.subtitle')}
      </p>
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
              porMillon(Number(val)),
              t('inmobiliaria.ai.cobranza.analitica.widgets.costPerPeso.sparklineLabel'),
            ]}
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}
