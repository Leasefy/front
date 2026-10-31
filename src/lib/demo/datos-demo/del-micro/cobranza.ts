/**
 * Cobranza (Mori) con datos de ejemplo (el modo demo; Nico 30-10-2026: «tiene que haber… la posibilidad de que se pueda
 * crear una demo real con datos para ver cómo quedaría pintada cada sección»). Lo que responde el MICRO, en su forma.
 * Deudores, cifras y movimientos INVENTADOS (los nombres van recortados, como los manda el micro).
 */
import type { CarteraOverviewResponse } from '@/lib/hooks/cobranza/use-cartera-overview';
import type { DailyReportResponse } from '@/lib/hooks/cobranza/use-daily-report';
import type { EscalationsListResponse } from '@/lib/hooks/cobranza/use-escalations';
import type { InboxListResponse } from '@/lib/hooks/cobranza/use-inbox';
import type { LegalArtifactListResponse } from '@/lib/hooks/cobranza/use-legal-artifacts';
import type { RecoveryResponse } from '@/lib/hooks/cobranza/use-recovery';
import type { LecturaDeLaDemo } from '../index';

const HOY = '2026-10-30';

function panorama(): CarteraOverviewResponse {
  return {
    kpis: { deudoresActivos: 23, pagadoHoyCop: 7_450_000, llamadasHoy: 18, escalacionesPendientes: 3 },
    stages: [
      { stage: 'S0', stageDisplayName: 'Pre-vencimiento', ordinal: 0, count: 41, avgDaysInStage: 4, weeklyDelta: 6 },
      { stage: 'S1', stageDisplayName: 'Mora temprana · 1–15 días', ordinal: 1, count: 12, avgDaysInStage: 6, weeklyDelta: -3 },
      { stage: 'S2', stageDisplayName: 'Mora administrativa · 16–45 días', ordinal: 2, count: 6, avgDaysInStage: 19, weeklyDelta: -1 },
      { stage: 'S3', stageDisplayName: 'Mora pre-jurídica · 46–89 días', ordinal: 3, count: 3, avgDaysInStage: 31, weeklyDelta: 0 },
      { stage: 'S4', stageDisplayName: 'Siniestro inmobiliario', ordinal: 4, count: 1, avgDaysInStage: 12, weeklyDelta: 1 },
      { stage: 'S5', stageDisplayName: 'Restitución / jurídico · 90+ días', ordinal: 5, count: 1, avgDaysInStage: 64, weeklyDelta: 0 },
      { stage: 'SX', stageDisplayName: 'Ilocalizable', ordinal: 6, count: 0, avgDaysInStage: 0, weeklyDelta: 0 },
    ],
    lastTransitions: [
      { id: 'demo-tr-1', debtorNameRedacted: 'Andrés G.', fromStage: 'S1', toStage: 'S0', reason: 'Pagó el canon de octubre por PSE', transitionedAt: `${HOY}T15:12:00.000Z`, actor: 'agent' },
      { id: 'demo-tr-2', debtorNameRedacted: 'Juan Pablo C.', fromStage: 'S1', toStage: 'S2', reason: 'Venció el plazo de la promesa de pago', transitionedAt: `${HOY}T13:40:00.000Z`, actor: 'agent' },
      { id: 'demo-tr-3', debtorNameRedacted: 'Comercializadora E.', fromStage: 'S2', toStage: 'S3', reason: 'Tres llamadas sin respuesta y carta de cobro enviada', transitionedAt: '2026-10-29T21:05:00.000Z', actor: 'agent' },
      { id: 'demo-tr-4', debtorNameRedacted: 'Valentina R.', fromStage: 'S2', toStage: 'S1', reason: 'Acuerdo de pago firmado: dos cuotas', transitionedAt: '2026-10-29T16:30:00.000Z', actor: 'human' },
      { id: 'demo-tr-5', debtorNameRedacted: 'Felipe Z.', fromStage: 'S3', toStage: 'S4', reason: 'Se reportó el siniestro a la aseguradora', transitionedAt: '2026-10-28T14:00:00.000Z', actor: 'human' },
    ],
    nextActions: [
      { id: 'demo-na-1', debtorNameRedacted: 'Juan Pablo C.', plannedFor: '2026-10-31T14:00:00.000Z', channel: 'voice', stage: 'S2' },
      { id: 'demo-na-2', debtorNameRedacted: 'Mariana O.', plannedFor: '2026-10-31T15:30:00.000Z', channel: 'whatsapp', stage: 'S0' },
      { id: 'demo-na-3', debtorNameRedacted: 'Comercializadora E.', plannedFor: '2026-11-02T14:00:00.000Z', channel: 'email', stage: 'S3' },
      { id: 'demo-na-4', debtorNameRedacted: 'Daniela C.', plannedFor: '2026-11-02T16:00:00.000Z', channel: 'voice', stage: 'S1' },
    ],
    generatedAt: `${HOY}T15:20:00.000Z`,
  };
}


const escalaciones = (): EscalationsListResponse => ({
  open: [
    { id: 'demo-esc-1', debtor_id: 'demo-deu-3', debtor_id_masked: 'Comercializadora El Poblado SAS', debtor_name: 'Comercializadora El Poblado SAS', call_id: null, reason: 'dispute', urgency: 'high', status: 'open', assignee_user_id: null, created_at: `${HOY}T14:05:00.000Z`, resolved_at: null },
  ],
  assigned: [],
  resolved: [],
  resolvedNextCursor: null,
  generatedAt: `${HOY}T15:20:00.000Z`,
});

const cartas = (): LegalArtifactListResponse => ({
  artifacts: [
    { id: 'demo-carta-1', debtorId: 'demo-deu-3', debtorName: 'Comercializadora El Poblado SAS', debtorDocument: null, kind: 'pre_judicial_letter', status: 'pending_human_review', pdfUrl: '', approvedByHumanUserId: null, approvedAt: null, physicalSendMethod: null, sentToAddress: null, sentAt: null, generatedAt: `${HOY}T09:00:00.000Z` },
  ],
});

const reporteDeHoy = (): DailyReportResponse => ({
  report_date: HOY,
  computed_at: `${HOY}T15:00:00.000Z`,
  summary: {
    pkr_7d_pct: 78,
    pkr_pct: 81,
    indice_morosidad_pct: 6.4,
    compliance_violations_count: 0,
    calls_outside_window_count: 0,
    payments_today_total_cop: 7_450_000,
    payments_today_count: 3,
    connect_rate_pct: 62,
    morosidad_base: { inquilinos_en_mora: 23, inquilinos_con_contrato: 358 },
  },
  top_debtors: [
    { debtor_id: 'demo-deu-3', debtor_name: 'Comercializadora El Poblado SAS', dpd: 52, balance_cop: 12_800_000, attempts: { total: 7, last_contact_at: '2026-10-29T21:05:00.000Z' }, next_step: { action: 'send_letter', label: 'Carta prejurídica', reason: 'Lleva 52 días en mora y no contesta' } },
    { debtor_id: 'demo-deu-5', debtor_name: 'Juan Pablo Cardona', dpd: 18, balance_cop: 1_650_000, attempts: { total: 4, last_contact_at: `${HOY}T13:40:00.000Z` }, next_step: { action: 'call', label: 'Llamar mañana a las 9', reason: 'Pidió un acuerdo de pago' } },
    { debtor_id: 'demo-deu-6', debtor_name: 'Valentina Ríos', dpd: 9, balance_cop: 1_450_000, attempts: { total: 2, last_contact_at: '2026-10-29T16:30:00.000Z' }, next_step: { action: 'wait', label: 'Esperar la primera cuota', reason: 'Firmó un acuerdo de dos cuotas' } },
  ],
  alerts: [],
});

function conversacion(id: string, nombre: string, label: string, preview: string, hace: string, sinLeer: boolean) {
  return { id, debtorId: `${id}-deudor`, channel: 'whatsapp', label, status: 'open', debtorName: nombre, unread: sinLeer, requiresAction: label !== 'pago_reportado', lastMessageAt: hace, lastMessagePreview: preview, createdAt: hace };
}

const bandeja = (): InboxListResponse => {
  const promesa = conversacion('demo-hilo-1', 'Daniela Cardona', 'promesa_detectada', 'Le pago el viernes sin falta, me consignan el miércoles', `${HOY}T14:48:00.000Z`, true);
  const pago = conversacion('demo-hilo-2', 'Andrés Gómez', 'pago_reportado', 'Ya pagué por PSE, le mando el comprobante', `${HOY}T15:10:00.000Z`, true);
  const acuerdo = conversacion('demo-hilo-3', 'Juan Pablo Cardona', 'solicitud_acuerdo', '¿Me pueden partir la deuda en dos cuotas?', `${HOY}T11:18:00.000Z`, false);
  return {
    groups: [
      { label: 'promesa_detectada', title: 'Promesas de pago', count: 1, threads: [promesa] },
      { label: 'pago_reportado', title: 'Pagos reportados', count: 1, threads: [pago] },
      { label: 'solicitud_acuerdo', title: 'Piden un acuerdo', count: 1, threads: [acuerdo] },
    ],
    totalThreads: 3,
    totalUnread: 2,
    generatedAt: `${HOY}T15:20:00.000Z`,
  };
};

const recaudo = (): RecoveryResponse => ({
  recoveredValueCop: 48_350_000,
  recoveredValueSource: 'payments',
  casesClosed: 31,
  casesManaged: 54,
  avgRecoveryDays: 9,
  responseRatePct: 71,
  promisesKept: 17,
  promisesTotal: 21,
  agreementsKept: 5,
  agreementsTotal: 6,
  casesEscalated: 4,
  moraReducedPct: 22,
  moraWindowDays: 30,
  moraDesdePct: 8.2,
  moraHastaPct: 6.4,
  moraDesdeDia: '2026-09-30',
  generatedAt: `${HOY}T15:20:00.000Z`,
});

/** La analítica: seis semanas de recaudo por etapa, las objeciones, el mejor horario y el costo por peso. */
function recaudoPorSemana() {
  const semanas = ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];
  return {
    populated: true,
    rows: semanas.flatMap((dia, i) =>
      (['S1', 'S2', 'S3'] as const).map((stage, j) => {
        const pct = [0.62, 0.41, 0.18][j]! + i * 0.015;
        const casos = [14, 7, 3][j]!;
        const total = [21_000_000, 13_500_000, 9_800_000][j]!;
        return { bucket_date: dia, stage, pct_n: pct, pct_cop: pct, debtors_recovered_count: Math.floor(casos * pct), debtors_in_stage_count: casos, recovered_cop: Math.floor(total * pct), total_cop_in_stage: total };
      }),
    ),
  };
}

const objeciones = () => ({
  populated: true,
  objections: [
    { rank: 1, literal: 'Me pagan la otra semana', count: 19, pct: 0.34 },
    { rank: 2, literal: 'Ya pagué, revisen', count: 11, pct: 0.2 },
    { rank: 3, literal: 'Necesito un acuerdo de pago', count: 9, pct: 0.16 },
    { rank: 4, literal: 'Hay un daño que no han arreglado', count: 6, pct: 0.11 },
    { rank: 5, literal: 'No me han mandado la factura', count: 4, pct: 0.07 },
  ],
});

function horario() {
  const celdas = [];
  for (let dia = 1; dia <= 6; dia++) for (let hora = 8; hora <= 19; hora++) {
    const pico = (hora >= 9 && hora <= 11) || (hora >= 17 && hora <= 18);
    celdas.push({ hour: hora, day_of_week: dia, call_count: pico ? 9 : 4, positive_outcome_pct: pico ? 0.58 - dia * 0.02 : 0.31 });
  }
  return {
    populated: true,
    channelMix: {
      populated: true,
      rows: [
        // Los resultados con el nombre que espera la gráfica (`CadenceChannelMixChart`).
        { channel: 'voice', outcome: 'completed', count: 64, pct: 0.3 },
        { channel: 'voice', outcome: 'paid', count: 41, pct: 0.19 },
        { channel: 'voice', outcome: 'no_answer', count: 51, pct: 0.24 },
        { channel: 'voice', outcome: 'escalated', count: 6, pct: 0.03 },
        { channel: 'whatsapp', outcome: 'completed', count: 33, pct: 0.15 },
        { channel: 'whatsapp', outcome: 'paid', count: 20, pct: 0.09 },
      ],
    },
    heatmap: { populated: true, cells: celdas },
  };
}

function costoPorPeso() {
  const dias = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(Date.UTC(2026, 7, 1 + i));
    return { day: d.toISOString().slice(0, 10), cost_per_peso: Math.round((0.021 - i * 0.00008) * 10_000) / 10_000 };
  });
  return { populated: true, cost_per_peso: 0.014, numerator_cop_voice: 676_900, denominator_cop_paid: 48_350_000, sparkline_90d: dias };
}

const guiones = () => ({
  populated: true,
  rows: [
    { scriptTemplateId: 'demo-gui-1', scriptName: 'Recordatorio amable antes del vencimiento', stage: 'S0', nCalls: 142, conversionRate: 0.71, lift: 0.18 },
    { scriptTemplateId: 'demo-gui-2', scriptName: 'Primera llamada en mora con enlace de pago', stage: 'S1', nCalls: 96, conversionRate: 0.54, lift: 0.12 },
    { scriptTemplateId: 'demo-gui-3', scriptName: 'Ofrecer acuerdo de dos cuotas', stage: 'S2', nCalls: 38, conversionRate: 0.39, lift: 0.07 },
  ],
});

export const COBRANZA_DEL_MICRO_DEMO: readonly LecturaDeLaDemo[] = [
  { patron: /^\/api\/agency\/[^/]+\/cartera\/overview(\?|$)/, respuesta: panorama },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/escalations(\?|$)/, respuesta: escalaciones },
  { patron: /^\/api\/agency\/[^/]+\/cartera\/legal-artifacts(\?|$)/, respuesta: cartas },
  { patron: /^\/api\/agency\/[^/]+\/cartera\/insurance-claims(\?|$)/, respuesta: () => ({ claims: [] }) },
  { patron: /^\/api\/agency\/[^/]+\/cartera\/payment-plans(\?|$)/, respuesta: () => ({ items: [] }) },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/daily-report\/today(\?|$)/, respuesta: reporteDeHoy },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/inbox(\?|$)/, respuesta: bandeja },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/recovery(\?|$)/, respuesta: recaudo },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/analytics\/recovery-rate(\?|$)/, respuesta: recaudoPorSemana },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/analytics\/top-objections(\?|$)/, respuesta: objeciones },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/analytics\/cadence(\?|$)/, respuesta: horario },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/analytics\/cost-per-peso(\?|$)/, respuesta: costoPorPeso },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/analytics\/top-scripts(\?|$)/, respuesta: guiones },
  { patron: /^\/api\/agency\/[^/]+\/cobranza\/analytics\/agency-gate(\?|$)/, respuesta: () => ({ populated: true, calls_30d: 412 }) },
];
