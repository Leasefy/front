'use client';

/**
 * CadenceChannelMixChart — Phase 37 plan 37-09
 *
 * Recharts stacked BarChart showing outcome distribution by channel (voice / whatsapp).
 * Long-format rows from the backend are pivoted client-side into wide format for Recharts.
 *
 * Three render branches (D-37-05):
 *   A — populated=false + reason='agency-gate' → return null (page handles full-page gate)
 *   B — populated=false + reason='insufficient-channel-mix' → EmptyState (honest empty, never stub chart)
 *   C — populated=true → real data chart
 *
 * NOTE: outcome-level i18n keys are present in the 37-07 scaffold under
 *   inmobiliaria.ai.cobranza.analitica.widgets.cadence.channelMix.outcome.*
 */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartBar } from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { EmptyState } from '@/components/data-display/EmptyState';

// ─── Type Definitions ─────────────────────────────────────────────────────────

interface ChannelMixRow {
  channel: 'voice' | 'whatsapp';
  outcome: string; // 'paid' | 'broken_promise' | 'escalated' | 'no_answer' | 'completed'
  count: number;
  pct: number; // 0..1 share of calls for that channel
}

type ChannelMixData =
  | { populated: true; rows: ChannelMixRow[] }
  | { populated: false; reason?: string; rows?: ChannelMixRow[] };

interface CadenceChannelMixChartProps {
  data: ChannelMixData;
}

// ─── Color Map ────────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<string, string> = {
  paid:            '#2C7A53', // semantic green (genuine positive)
  broken_promise:  '#9B9B9B', // neutral-light
  escalated:       '#C4503B', // semantic red (negative)
  no_answer:       '#C9CDD3', // neutral-pale
  completed:       '#1A40FF', // electric-blue (primary)
};

const OUTCOME_ORDER = ['paid', 'broken_promise', 'escalated', 'no_answer', 'completed'] as const;

// ─── Channel Label Map ────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  voice:    'Voz',
  whatsapp: 'WhatsApp',
};

// ─── Pivot Helper ─────────────────────────────────────────────────────────────
// Converts long-format rows → wide format for Recharts stacked BarChart:
//   { channel: 'voice', paid: 12, no_answer: 18, ... }

type PivotedRow = Record<string, string | number>;

function pivotRows(rows: ChannelMixRow[]): PivotedRow[] {
  return (['voice', 'whatsapp'] as const).map((ch) => {
    const chRows = rows.filter((r) => r.channel === ch);
    return chRows.reduce<PivotedRow>(
      (acc, r) => ({ ...acc, [r.outcome]: r.count }),
      { channel: ch as string }
    );
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CadenceChannelMixChart({ data }: CadenceChannelMixChartProps) {
  const { t } = useI18n();

  // Branch A — agency-gate: page-level gate handles this
  if (!data.populated && data.reason === 'agency-gate') {
    return null;
  }

  // Branch B — no real data yet
  if (!data.populated) {
    return (
      <EmptyState
        icon={ChartBar}
        title={t('inmobiliaria.ai.cobranza.analitica.widgets.cadence.channelMix.title')}
        description="Sin datos suficientes todavía"
      />
    );
  }

  // Branch C — real data
  const pivotedData = pivotRows(data.rows);

  return (
    <div>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
        {t('inmobiliaria.ai.cobranza.analitica.widgets.cadence.channelMix.title')}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={pivotedData}>
          <XAxis
            dataKey="channel"
            tickFormatter={(v: string) => CHANNEL_LABELS[v] ?? v}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          {OUTCOME_ORDER.map((outcome) => (
            <Bar
              key={outcome}
              stackId="a"
              dataKey={outcome}
              fill={OUTCOME_COLORS[outcome]}
              name={t(`inmobiliaria.ai.cobranza.analitica.widgets.cadence.channelMix.outcome.${
                outcome === 'broken_promise' ? 'brokenPromise' :
                outcome === 'no_answer'      ? 'noAnswer'      :
                outcome
              }`)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
