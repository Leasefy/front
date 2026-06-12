// Cobranza Analytics Fixture Data
// Canonical shapes from 37-SCHEMA-ALIGNMENT.md §6
// These constants provide deterministic sample data for all 5 analytics widgets.
// Plans 37-08, 37-09, 37-10 import these constants for type contracts and dev-mode rendering.

// ─── Type Aliases ─────────────────────────────────────────────────────────────

type RecoveryRateResponse = {
  populated: boolean;
  reason?: 'agency-gate' | 'insufficient-buckets';
  rows: Array<{
    bucket_date: string;         // ISO date 'YYYY-MM-DD'
    stage: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
    pct_n: number;               // 0..1 — debtors_recovered / debtors_in_stage
    pct_cop: number;             // 0..1 — recovered_cop / total_cop_in_stage
    debtors_recovered_count: number;
    debtors_in_stage_count: number;
    recovered_cop: string;       // DECIMAL as string for BigInt safety
    total_cop_in_stage: string;  // DECIMAL as string for BigInt safety
  }>;
};

type TopObjectionsResponse = {
  populated: boolean;
  reason?: 'agency-gate' | 'insufficient-objections';
  objections: Array<{
    rank: number;
    literal: string;
    count: number;
    pct: number; // 0..1 share of calls in window
  }>;
};

type CadenceResponse = {
  populated: boolean;
  reason?: 'agency-gate' | 'insufficient-channel-mix' | 'insufficient-heatmap';
  channelMix?: {
    populated: boolean;
    rows: Array<{ channel: 'voice' | 'whatsapp'; outcome: string; count: number; pct: number }>;
  };
  heatmap?: {
    populated: boolean;
    cells: Array<{
      hour: number;              // 0..23
      day_of_week: number;       // 0=Sun..6=Sat
      call_count: number;
      positive_outcome_pct: number; // 0..1
    }>;
  };
};

type CostPerPesoResponse = {
  populated: boolean;
  reason?: 'agency-gate' | 'insufficient-data';
  cost_per_peso?: number | null;
  numerator_usd_voice?: number | null;
  denominator_cop_paid?: number | null;
  sparkline_90d?: Array<{
    day: string;                // ISO date 'YYYY-MM-DD'
    cost_per_peso: number | null;
  }>;
};

type TopScriptsResponse = {
  populated: false;
  reason: 'schema_pending';
  rows: never[];
  pendingPhase: 38;
};

// ─── STUB_RECOVERY_RATE ────────────────────────────────────────────────────────
// 30 rows: 5 sampled bucket_dates × 6 stages (S1..S5 + S0 omitted as S0 is pre-vencimiento)
// populated: false — triggers SampleDataWatermark in the widget

const RECOVERY_STAGES = ['S1', 'S2', 'S3', 'S4', 'S5'] as const;
const RECOVERY_DATES = [
  '2026-05-01',
  '2026-05-08',
  '2026-05-15',
  '2026-05-22',
  '2026-05-28',
] as const;

// Deterministic values per stage (realistic declining recovery as stage increases)
const STAGE_PARAMS: Record<string, { pct_n: number; pct_cop: number; count: number; in_stage: number; cop: number; total_cop: number }> = {
  S1: { pct_n: 0.48, pct_cop: 0.43, count: 8, in_stage: 17, cop: 1750000, total_cop: 4100000 },
  S2: { pct_n: 0.32, pct_cop: 0.28, count: 5, in_stage: 16, cop: 1200000, total_cop: 4300000 },
  S3: { pct_n: 0.22, pct_cop: 0.18, count: 4, in_stage: 18, cop: 950000,  total_cop: 5300000 },
  S4: { pct_n: 0.15, pct_cop: 0.12, count: 3, in_stage: 20, cop: 580000,  total_cop: 4800000 },
  S5: { pct_n: 0.10, pct_cop: 0.08, count: 2, in_stage: 20, cop: 450000,  total_cop: 5600000 },
};

export const STUB_RECOVERY_RATE: RecoveryRateResponse = {
  populated: false,
  rows: RECOVERY_DATES.flatMap((bucket_date) =>
    RECOVERY_STAGES.map((stage) => {
      const p = STAGE_PARAMS[stage];
      return {
        bucket_date,
        stage,
        pct_n: p.pct_n,
        pct_cop: p.pct_cop,
        debtors_recovered_count: p.count,
        debtors_in_stage_count: p.in_stage,
        recovered_cop: String(p.cop),
        total_cop_in_stage: String(p.total_cop),
      };
    })
  ),
};

// ─── STUB_TOP_OBJECTIONS ───────────────────────────────────────────────────────
// 10 realistic Spanish objection phrases — no PII, no phone numbers, no names

export const STUB_TOP_OBJECTIONS: TopObjectionsResponse = {
  populated: false,
  objections: [
    { rank: 1,  literal: 'No tengo plata ahorita',                      count: 12, pct: 0.185 },
    { rank: 2,  literal: 'Llámeme la próxima semana',                   count: 11, pct: 0.169 },
    { rank: 3,  literal: 'Ya hablé con mi jefe de eso',                 count:  9, pct: 0.138 },
    { rank: 4,  literal: 'No reconozco esa deuda',                      count:  8, pct: 0.123 },
    { rank: 5,  literal: 'Estoy esperando mi quincena',                 count:  7, pct: 0.108 },
    { rank: 6,  literal: 'Me van a pagar mañana',                       count:  6, pct: 0.092 },
    { rank: 7,  literal: 'No tengo cómo pagar en este momento',         count:  5, pct: 0.077 },
    { rank: 8,  literal: 'Necesito hablar con alguien primero',         count:  4, pct: 0.062 },
    { rank: 9,  literal: 'Ya estoy arreglando eso con la inmobiliaria', count:  3, pct: 0.046 },
    { rank: 10, literal: 'No vivo ahí hace meses',                      count:  3, pct: 0.046 },
  ],
};

// ─── STUB_CADENCE ──────────────────────────────────────────────────────────────
// channelMix: 8 rows (voice × 4 outcomes + whatsapp × 4 outcomes)
// heatmap: 168 cells (24 hours × 7 days)
// populated: false at all levels

const CHANNEL_MIX_ROWS: CadenceResponse['channelMix'] = {
  populated: false,
  rows: [
    { channel: 'voice',     outcome: 'completed',      count: 142, pct: 39.9 },
    { channel: 'voice',     outcome: 'no_answer',      count: 118, pct: 33.1 },
    { channel: 'voice',     outcome: 'broken_promise', count:  56, pct: 15.7 },
    { channel: 'voice',     outcome: 'escalated',      count:  40, pct: 11.2 },
    { channel: 'whatsapp',  outcome: 'completed',      count:  87, pct: 43.5 },
    { channel: 'whatsapp',  outcome: 'no_answer',      count:  62, pct: 31.0 },
    { channel: 'whatsapp',  outcome: 'broken_promise', count:  32, pct: 16.0 },
    { channel: 'whatsapp',  outcome: 'escalated',      count:  19, pct:  9.5 },
  ],
};

// Heatmap generation: 24 hours × 7 days (0=Sun..6=Sat)
// Business hours Mon-Fri 9am-12pm = high call volume + higher positive outcomes
function generateHeatmapCells(): NonNullable<CadenceResponse['heatmap']>['cells'] {
  const cells: NonNullable<CadenceResponse['heatmap']>['cells'] = [];
  for (let day_of_week = 0; day_of_week <= 6; day_of_week++) {
    const isWeekday = day_of_week >= 1 && day_of_week <= 5; // Mon=1..Fri=5
    for (let hour = 0; hour <= 23; hour++) {
      const isPeakHour = isWeekday && hour >= 9 && hour <= 12;
      const isMidHour  = isWeekday && ((hour >= 13 && hour <= 17) || (hour >= 8 && hour <= 8));
      const call_count = isPeakHour
        ? 8 + ((hour + day_of_week) % 4)   // 8..11
        : isMidHour
        ? 3 + ((hour + day_of_week) % 3)   // 3..5
        : isWeekday
        ? 1 + ((hour * day_of_week) % 2)   // 1..2
        : (hour + day_of_week) % 3;        // 0..2 weekends
      const positive_outcome_pct = isPeakHour
        ? 0.42 + (((hour + day_of_week) % 10) / 100)   // 0.42..0.51
        : isMidHour
        ? 0.28 + (((hour + day_of_week) % 8) / 100)    // 0.28..0.35
        : isWeekday
        ? 0.18 + (((hour * 2 + day_of_week) % 8) / 100) // 0.18..0.25
        : 0.10 + (((hour + day_of_week) % 6) / 100);   // 0.10..0.15
      cells.push({
        hour,
        day_of_week,
        call_count,
        positive_outcome_pct: Math.round(positive_outcome_pct * 1000) / 1000,
      });
    }
  }
  return cells;
}

export const STUB_CADENCE: CadenceResponse = {
  populated: false,
  reason: 'insufficient-channel-mix',
  channelMix: CHANNEL_MIX_ROWS,
  heatmap: {
    populated: false,
    cells: generateHeatmapCells(),
  },
};

// ─── STUB_COST_PER_PESO ────────────────────────────────────────────────────────
// 90-day daily sparkline (Mar–May 2026) trending down ~0.055 → ~0.034 USD/COP
// Matches BACKEND response shape: cost_per_peso, numerator_usd_voice,
// denominator_cop_paid, sparkline_90d:[{day, cost_per_peso}] — NOT the §6
// "costCop30d/recoveredCop30d/sparkline:[{month}]" naming which was speculative.

function generateCostSparkline(): NonNullable<CostPerPesoResponse['sparkline_90d']> {
  const start = new Date('2026-03-01T00:00:00Z');
  const cells: NonNullable<CostPerPesoResponse['sparkline_90d']> = [];
  for (let i = 0; i < 90; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    // declining trend with daily wobble: ~0.055 down to ~0.034
    const base = 0.055 - (i / 90) * 0.021;
    const wobble = ((i * 7) % 11) / 1000;
    const cost = Math.round((base + wobble) * 10000) / 10000;
    cells.push({ day, cost_per_peso: cost });
  }
  return cells;
}

export const STUB_COST_PER_PESO: CostPerPesoResponse = {
  populated: false,
  reason: 'insufficient-data',
  cost_per_peso: 0.041,
  numerator_usd_voice: 950,
  denominator_cop_paid: 23_170_731_707,  // ~$0.041 USD per peso recovered
  sparkline_90d: generateCostSparkline(),
};

// ─── STUB_TOP_SCRIPTS ─────────────────────────────────────────────────────────
// Permanent stub — RESEARCH LANDMINE-1.
// Call model carries no FK to ScriptTemplate. Deferred to Phase 38.
// DO NOT implement this widget until Phase 38 adds the schema column.

export const STUB_TOP_SCRIPTS: TopScriptsResponse = {
  rows: [],
  populated: false as const,
  reason: 'schema_pending' as const,
  pendingPhase: 38,
};
