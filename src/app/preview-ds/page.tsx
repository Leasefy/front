'use client';

/**
 * /preview-ds — Public, self-contained design-system preview
 *
 * The inmobiliaria dashboard rendered with REAL @leasefy/cadence components
 * (KpiCard, Eyebrow, StatusBadge, BrandMark, Table, Card, Button,
 * QuickActionChips) instead of hand-rolled replicas. No auth, providers,
 * i18n or data hooks. All data is Colombian demo fixtures.
 *
 * Stays hand-made on purpose:
 *  - Sidebar/TopBar layout (page-specific chrome) — but on DS tokens + BrandMark.
 *  - The Recaudo area chart (no 1:1 DS chart equivalent) — blue ramp per contract.
 *
 * Visit /preview-ds to see the new look without logging in.
 */

import { useState } from 'react';
import {
  BrandMark,
  BrandDot,
  Eyebrow,
  MonoLabel,
  StatusBadge,
  type SemanticTone,
  KpiCard,
  Card,
  Button,
  Table,
  THead,
  TBody,
  TFoot,
  TR,
  TH,
  TD,
  QuickActionChips,
  cn,
} from '@leasefy/cadence';
import {
  Buildings,
  House,
  CurrencyDollar,
  Wallet,
  Kanban,
  Clock,
  FileText,
  Warning,
  TrendUp,
  TrendDown,
  Robot,
  Sparkle,
  SquaresFour,
  UserCircle,
  ChatText,
  PaperPlaneTilt,
  Receipt,
  Bank,
  ChartLine,
  Plus,
  Lightning,
  CaretRight,
  ArrowClockwise,
  Funnel,
  Bell,
} from '@phosphor-icons/react';

// ─── Demo data ────────────────────────────────────────────────────────────────

const KPI_DATA = {
  totalProperties: 128,
  propertiesRented: 96,
  propertiesAvailable: 32,
  occupancyRate: 96,
  collectedRevenue: 452_300_000,
  expectedRevenue: 470_000_000,
  collectionRate: 96.2,
  totalCommissions: 38_500_000,
  lateCollections: 8_400_000,
  pendingCollections: 3,
  activeLeads: 21,
  scheduledVisits: 8,
  contractsInProgress: 5,
  closedThisMonth: 12,
  avgDaysToClose: 18,
  pendingDispersions: 7,
};

const PIPELINE_ITEMS = [
  { id: 1, candidate: 'Andrés Cárdenas', property: 'Apto 301 · Chapinero',     stage: 'Evaluación', stageKey: 'eval' },
  { id: 2, candidate: 'Laura Restrepo',  property: 'Oficina 502 · El Poblado',  stage: 'Visita',     stageKey: 'visit' },
  { id: 3, candidate: 'Carlos Mejía',    property: 'Local 1 · Centro',           stage: 'Contrato',   stageKey: 'contract' },
  { id: 4, candidate: 'Diana Gómez',     property: 'Apto 802 · Laureles',        stage: 'Evaluación', stageKey: 'eval' },
];

const TEAM = [
  { id: 1, name: 'Juan Pérez',  initials: 'JP', closings: 5, commission: 12_400_000 },
  { id: 2, name: 'María Rojas', initials: 'MR', closings: 3, commission: 8_100_000 },
  { id: 3, name: 'Camilo Gil',  initials: 'CG', closings: 4, commission: 9_700_000 },
];

const MONTHS = ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb'];

// SVG paths for collection trend (9-month area chart)
const CHART_AREA = 'M0,118 C60,112 100,108 150,100 C210,90 250,96 300,78 C360,58 400,70 450,60 C520,46 560,52 600,40 C670,24 720,34 780,22 C830,14 870,20 900,16 L900,150 L0,150 Z';
const CHART_LINE = 'M0,118 C60,112 100,108 150,100 C210,90 250,96 300,78 C360,58 400,70 450,60 C520,46 560,52 600,40 C670,24 720,34 780,22 C830,14 870,20 900,16';

// Stage → semantic tone (engineered signals, BRAND-CONTRACT §2):
// pending = neutral gray · active/on-track = info · confirmed/won = success
const STAGE_TONE: Record<string, SemanticTone> = {
  eval: 'neutral',
  visit: 'info',
  contract: 'success',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function fmtLong(n: number): string {
  return '$' + n.toLocaleString('es-CO');
}

// ─── Section header — Eyebrow grammar applied to in-card section titles ──────

function SectionHeader({ title, sub, link, dot }: { title: string; sub?: string; link?: string; dot?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-baseline gap-2.5">
        {dot && <BrandDot className="self-center" />}
        <h2 className="font-display text-h3 font-medium tracking-[-0.01em] text-fg">{title}</h2>
        {sub && <span className="font-body text-caption text-fg-muted">{sub}</span>}
      </div>
      {link && (
        <a
          href="#"
          className="flex cursor-pointer items-center gap-1 font-body text-caption text-fg-muted transition-colors hover:text-fg"
        >
          {link}
          <CaretRight className="h-3 w-3" weight="bold" />
        </a>
      )}
    </div>
  );
}

// ─── Sidebar — page-specific chrome on DS tokens + BrandMark ─────────────────

function Sidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-[188px] flex-shrink-0 flex-col overflow-y-auto border-r border-border-faint bg-surface">
      {/* Brand header — official monogram tile from @leasefy/cadence */}
      <div className="flex items-center gap-2.5 border-b border-border-faint px-3.5 py-3.5">
        <BrandMark size={22} />
        <span className="font-display text-[13.5px] font-medium tracking-[-0.01em] text-fg">
          Leasefy
        </span>
        <CaretRight className="ml-auto h-3 w-3 text-fg-subtle" />
      </div>

      {/* Autopilot */}
      <NavSection label="Autopilot" />
      <NavItem icon={Robot} label="Agentes IA" />

      {/* Inicio */}
      <NavSection label="Inicio" />
      <NavItem icon={Sparkle} label="Hoy" />
      <NavItem icon={SquaresFour} label="Dashboard" active />

      {/* Comercial */}
      <NavSection label="Comercial" />
      <NavItem icon={UserCircle} label="Propietarios" />
      <NavItem icon={House} label="Propiedades" />
      <NavItem icon={Kanban} label="Pipeline" />
      <NavItem icon={ChatText} label="Mensajes" badge="5" />

      {/* Financiero · ERP */}
      <NavSection label="Financiero · ERP" />
      <NavItem icon={CurrencyDollar} label="Cobros" />
      <NavItem icon={PaperPlaneTilt} label="Dispersiones" />
      <NavItem icon={Receipt} label="Facturación" />
      <NavItem icon={Bank} label="Conciliación" />
      <NavItem icon={ChartLine} label="Reportes" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer — account */}
      <div className="flex items-center gap-2 border-t border-border-faint px-3.5 py-3">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft font-mono text-[10px] font-semibold text-primary">
          MG
        </span>
        <div className="min-w-0">
          <div className="truncate font-body text-caption font-medium text-fg">Mayexpro S.A.S</div>
          <MonoLabel className="text-[10px] text-fg-subtle">Plan Pro</MonoLabel>
        </div>
      </div>
    </aside>
  );
}

function NavSection({ label }: { label: string }) {
  return (
    <MonoLabel className="block px-3.5 pb-0.5 pt-3.5 text-[10px] text-fg-subtle">
      {label}
    </MonoLabel>
  );
}

function NavItem({
  icon: Icon,
  label,
  badge,
  active,
}: {
  icon: React.ElementType;
  label: string;
  badge?: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative mx-1.5 flex h-8 cursor-pointer select-none items-center gap-2 rounded-md px-2 font-body text-[13px] transition-colors',
        active
          ? 'bg-primary-soft font-medium text-primary'
          : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
      )}
    >
      {/* Electric blue 2px left accent bar for active item */}
      {active && (
        <span className="absolute bottom-1 left-0 top-1 w-[2px] rounded-full bg-primary" />
      )}
      <Icon
        weight={active ? 'fill' : 'regular'}
        className={cn('h-[15px] w-[15px] flex-shrink-0', active ? 'text-primary' : 'text-fg-subtle')}
      />
      <span className="flex-1 leading-none">{label}</span>
      {badge && (
        <span className="font-mono text-[10.5px] tabular-nums text-fg-subtle">{badge}</span>
      )}
    </div>
  );
}

// ─── Top bar — page-specific chrome on DS tokens + Button ────────────────────

function TopBar() {
  return (
    <div className="sticky top-0 z-10 flex h-[46px] items-center gap-2.5 border-b border-border-faint bg-surface px-6">
      <span className="font-body text-body-sm text-fg-muted">
        Panel{' '}
        <span className="mx-1 text-fg-subtle">/</span>
        <span className="font-medium text-fg">Dashboard</span>
      </span>
      <span className="flex-1" />
      {/* Primary CTA — DS Button (blue = actionable) */}
      <Button size="sm">
        <Plus weight="bold" />
        Nuevo
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Notificaciones">
        <Bell />
      </Button>
      {/* Credits chip */}
      <div className="flex h-7 items-center gap-1.5 rounded-full border border-border px-3 font-body text-caption text-fg-muted">
        <Lightning className="h-3 w-3 text-primary" weight="fill" />
        <span className="font-display font-medium tabular-nums text-fg">4.820</span>
      </div>
      {/* Avatar */}
      <span className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary-soft font-mono text-[10.5px] font-semibold text-primary">
        MG
      </span>
    </div>
  );
}

// ─── Secondary stat card — built on DS Card + MonoLabel ──────────────────────

function SecondaryCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
}) {
  return (
    <Card className="cursor-default p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-surface-muted p-2">
          <Icon weight="duotone" className="h-4 w-4 text-fg-muted" />
        </div>
        <div>
          <p className="font-display text-[18px] font-medium leading-none tabular-nums text-fg">
            {value}
          </p>
          <MonoLabel className="mt-0.5 block">{label}</MonoLabel>
        </div>
      </div>
    </Card>
  );
}

// ─── AI Agent card — DS Card + StatusBadge ───────────────────────────────────

function AIAgentCard({
  name,
  metrics,
}: {
  name: string;
  metrics: { label: string; value: string }[];
}) {
  return (
    <Card className="cursor-default p-5">
      <div className="mb-5 flex items-center gap-2.5">
        <div className="rounded-md bg-surface-muted p-1.5">
          <Robot weight="duotone" className="h-[15px] w-[15px] text-fg-muted" />
        </div>
        <span className="font-display text-h3 font-medium text-fg">{name}</span>
        <StatusBadge tone="info" pulse className="ml-auto">
          activo
        </StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="font-display text-[20px] font-medium leading-none tracking-[-0.01em] tabular-nums text-fg">
              {m.value}
            </div>
            <MonoLabel className="mt-1 block">{m.label}</MonoLabel>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Area chart — hand-made SVG (no 1:1 DS equivalent), blue ramp ────────────

function RecaudoChart() {
  return (
    <div className="rounded-lg border border-border-faint bg-bg p-5">
      <SectionHeader dot title="Recaudo" sub="últimos 9 meses" link="Reportes" />
      <svg
        viewBox="0 0 900 150"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: 132 }}
      >
        <defs>
          <linearGradient id="pg-grad" x1="0" y1="0" x2="0" y2="1">
            {/* Electric blue #1A40FF gradient */}
            <stop offset="0%" stopColor="#1A40FF" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#1A40FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Hairline grid */}
        {[37, 75, 113].map((y) => (
          <line key={y} x1="0" y1={y} x2="900" y2={y} stroke="#E5E5E5" strokeWidth="1" />
        ))}
        <path d={CHART_AREA} fill="url(#pg-grad)" />
        <path
          d={CHART_LINE}
          fill="none"
          stroke="#1A40FF"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-2 flex justify-between px-0.5">
        {MONTHS.map((m) => (
          <MonoLabel key={m}>{m}</MonoLabel>
        ))}
      </div>
    </div>
  );
}

// ─── Pipeline table — DS Table + StatusBadge ─────────────────────────────────

function PipelineTable() {
  return (
    <Card className="p-5">
      <SectionHeader dot title="Pipeline" link="Ver todo" />
      <Table>
        <THead className="bg-transparent">
          <TR className="hover:bg-transparent">
            <TH className="pl-0">Candidato</TH>
            <TH>Propiedad</TH>
            <TH numeric className="pr-0">Etapa</TH>
          </TR>
        </THead>
        <TBody>
          {PIPELINE_ITEMS.map((item) => (
            <TR key={item.id} className="cursor-pointer">
              <TD className="pl-0 font-medium">{item.candidate}</TD>
              <TD muted className="text-caption">{item.property}</TD>
              <TD numeric className="pr-0">
                <StatusBadge tone={STAGE_TONE[item.stageKey] ?? 'neutral'}>
                  {item.stage}
                </StatusBadge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

// ─── Team table — DS Table with TFoot summary row ────────────────────────────

function TeamTable() {
  return (
    <Card className="p-5">
      <SectionHeader dot title="Equipo" sub="4 activos" link="Ver" />
      <Table>
        <THead className="bg-transparent">
          <TR className="hover:bg-transparent">
            <TH className="pl-0">Agente</TH>
            <TH numeric>Cierres</TH>
            <TH numeric className="pr-0">Comisión</TH>
          </TR>
        </THead>
        <TBody>
          {TEAM.map((a) => (
            <TR key={a.id} className="cursor-pointer">
              <TD className="pl-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted font-mono text-[10px] font-semibold text-fg-muted">
                    {a.initials}
                  </span>
                  <span className="font-medium">{a.name}</span>
                </div>
              </TD>
              <TD numeric className="font-display font-medium">{a.closings}</TD>
              <TD numeric className="pr-0 font-display font-medium">{fmt(a.commission)}</TD>
            </TR>
          ))}
        </TBody>
        <TFoot>
          <TR className="hover:bg-transparent">
            <TD className="pl-0 py-2">
              <MonoLabel>Promedio al cierre</MonoLabel>
            </TD>
            <TD numeric colSpan={2} className="pr-0 py-2 text-caption text-fg-muted">
              {KPI_DATA.avgDaysToClose} días
            </TD>
          </TR>
        </TFoot>
      </Table>
    </Card>
  );
}

// ─── Financial stat ───────────────────────────────────────────────────────────

function FinancialStat({ label, value, isRed }: { label: string; value: string; isRed?: boolean }) {
  return (
    <div>
      <MonoLabel className="mb-1.5 block">{label}</MonoLabel>
      <p
        className={cn(
          'font-display text-[20px] font-medium leading-none tracking-[-0.01em] tabular-nums',
          isRed ? 'text-danger' : 'text-fg'
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Stat strip item ──────────────────────────────────────────────────────────

interface StatStripItem {
  label: string;
  value: string;
  sub: string;
  subDown?: boolean;
}

function StatStrip({ items }: { items: StatStripItem[] }) {
  return (
    <div className="-mx-1 mt-7 flex border-b border-t border-border">
      {items.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'flex-1 py-5',
            i === 0 ? 'pl-4 pr-5' : 'px-5',
            i > 0 && 'border-l border-border-faint'
          )}
        >
          <MonoLabel className="block">{s.label}</MonoLabel>
          <div className="mt-2.5 font-display text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums text-fg">
            {s.value}
          </div>
          <div
            className={cn(
              'mt-1.5 flex items-center gap-1 font-body text-[11.5px]',
              s.subDown ? 'text-danger' : 'text-fg-muted'
            )}
          >
            {!s.subDown && s.sub.startsWith('+') && <TrendUp className="h-2.5 w-2.5" weight="bold" />}
            {s.subDown && <TrendDown className="h-2.5 w-2.5" weight="bold" />}
            {s.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PreviewDSPage() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const periods = ['Hoy', '7 días', '30 días', 'Año'];

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />

      <div className="min-w-0 flex-1 bg-surface">
        <TopBar />

        {/* Page scroll area */}
        <div className="mx-auto max-w-[1160px] px-8 pb-20 pt-10">

          {/* ── Page header — premium opening ── */}
          <div className="flex items-end justify-between">
            <div>
              {/* Eyebrow from @leasefy/cadence — BrandDot + mono label, accent blue */}
              <Eyebrow accent className="mb-2">
                Inmobiliaria · Junio 2026
              </Eyebrow>
              <h1 className="font-display text-[22px] font-medium leading-snug tracking-[-0.01em] text-fg">
                Resumen general
              </h1>
              <p className="mt-1.5 font-body text-[13.5px] text-fg-muted">
                Vista operativa · Mayexpro S.A.S
              </p>
            </div>
          </div>

          {/* ── Period / filter controls ── */}
          <div className="mt-7 flex items-center gap-2">
            <div className="flex rounded-md bg-surface-muted p-0.5">
              {periods.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPeriodIdx(i)}
                  className={cn(
                    'h-[26px] cursor-pointer rounded-sm border-none px-3 font-body text-caption transition-all',
                    i === periodIdx
                      ? 'bg-surface font-medium text-fg'
                      : 'bg-transparent text-fg-muted hover:text-fg'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm">
              <Funnel />
              Filtros
            </Button>
            <span className="flex-1" />
            <Button variant="ghost" size="sm">
              <ArrowClockwise />
              Actualizar
            </Button>
          </div>

          {/* ── Stat strip — 5 metrics with hairline dividers ── */}
          <StatStrip
            items={[
              { label: 'Total propiedades',  value: '128',      sub: '96 arrendadas · 32 libres' },
              { label: 'Ocupación',          value: '96%',      sub: '+2.4%' },
              { label: 'Recaudo mensual',    value: '$452.3M',  sub: '+5.2%' },
              { label: 'Comisiones',         value: '$38.5M',   sub: '+8.1%' },
              { label: 'En mora',            value: '$8.4M',    sub: '3 pagos', subDown: true },
            ]}
          />

          {/* ── 4 KPI cards — DS KpiCard; "Recaudo mensual" is the brandHero anchor ── */}
          <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total propiedades"
              value={String(KPI_DATA.totalProperties)}
              sublabel={`${KPI_DATA.propertiesRented} arrendadas · ${KPI_DATA.propertiesAvailable} disponibles`}
              icon={<Buildings weight="duotone" />}
            />
            {/* Brand hero card — ink gradient + BrandContour + glow (1 per screen) */}
            <KpiCard
              brandHero
              label="Recaudo mensual"
              value={fmtLong(KPI_DATA.collectedRevenue)}
              sublabel={`Tasa de recaudo ${KPI_DATA.collectionRate.toFixed(1)}%`}
              delta="+5.2% vs mes anterior"
              deltaDirection="up"
              icon={<CurrencyDollar weight="duotone" />}
            />
            <KpiCard
              label="Comisiones generadas"
              value={fmtLong(KPI_DATA.totalCommissions)}
              delta="+8.1%"
              deltaDirection="up"
              sublabel="Este mes"
              icon={<Wallet weight="duotone" />}
            />
            <KpiCard
              label="Tasa de ocupación"
              value={`${KPI_DATA.occupancyRate}%`}
              sublabel={`${KPI_DATA.propertiesRented} de ${KPI_DATA.totalProperties} propiedades`}
              icon={<House weight="duotone" />}
            />
          </div>

          {/* ── 4 secondary stat cards — all gray icon tiles ── */}
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <SecondaryCard icon={Kanban}   value={KPI_DATA.activeLeads}         label="Leads activos" />
            <SecondaryCard icon={Clock}    value={KPI_DATA.scheduledVisits}     label="Visitas programadas" />
            <SecondaryCard icon={FileText} value={KPI_DATA.contractsInProgress} label="Contratos en proceso" />
            <SecondaryCard icon={Warning}  value={KPI_DATA.pendingCollections}  label="Cobros pendientes" />
          </div>

          {/* ── Recaudo chart ── */}
          <div className="mt-9">
            <RecaudoChart />
          </div>

          {/* ── Agentes IA ── */}
          <div className="mt-9">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <BrandDot />
                  <h2 className="font-display text-h3 font-medium text-fg">
                    Agentes IA
                  </h2>
                </div>
                <span className="font-body text-caption text-fg-muted">
                  12 acciones hoy ·{' '}
                  <span className="font-medium text-fg">2 requieren atención</span>
                </span>
              </div>
              <a
                href="#"
                className="flex cursor-pointer items-center gap-1 font-body text-caption text-fg-muted transition-colors hover:text-fg"
              >
                Ver todos
                <CaretRight className="h-3 w-3" weight="bold" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <AIAgentCard
                name="Scoring de inquilinos"
                metrics={[
                  { label: 'Evaluaciones / mes', value: '142' },
                  { label: 'Tiempo promedio',    value: '< 3 min' },
                  { label: 'Precisión',          value: '94%' },
                  { label: 'Escalado a humano',  value: '2%' },
                ]}
              />
              <AIAgentCard
                name="Smart Matching"
                metrics={[
                  { label: 'Sugeridos / semana',    value: '38' },
                  { label: 'Conversión',             value: '32%' },
                  { label: 'Candidatos redirigidos', value: '38' },
                  { label: 'Compatibilidad media',   value: '78%' },
                ]}
              />
            </div>
          </div>

          {/* ── Pipeline + Equipo — DS Cards + Tables ── */}
          <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PipelineTable />
            <TeamTable />
          </div>

          {/* ── Acciones rápidas — DS QuickActionChips ── */}
          <div className="mt-9">
            <Eyebrow className="mb-3.5">Acciones rápidas</Eyebrow>
            <QuickActionChips
              chips={[
                { id: 'owner',    label: 'Nuevo propietario',  icon: <UserCircle /> },
                { id: 'listing',  label: 'Nueva consignación', icon: <Buildings /> },
                { id: 'payment',  label: 'Registrar pago',     icon: <CurrencyDollar /> },
                { id: 'reports',  label: 'Ver reportes',       icon: <ChartLine /> },
                { id: 'more',     label: 'Más',                icon: <Plus /> },
              ]}
            />
          </div>

          {/* ── Alert line ── */}
          <div className="mt-5">
            <div className="flex items-center gap-3 rounded-md border border-border bg-bg px-4 py-3 font-body text-caption text-fg-muted">
              <Warning className="h-4 w-4 flex-shrink-0 text-fg-muted" weight="duotone" />
              <span>
                <strong className="font-semibold text-fg">3 pagos en mora</strong> por $8.4M ·{' '}
                2 solicitudes de mantenimiento pendientes
              </span>
              <a
                href="#"
                className="ml-auto flex cursor-pointer items-center gap-1 whitespace-nowrap font-medium text-primary transition-colors hover:text-primary-hover"
              >
                Revisar
                <CaretRight className="h-3 w-3" weight="bold" />
              </a>
            </div>
          </div>

          {/* ── Resumen financiero — DS Card + Eyebrow ── */}
          <Card className="mt-9 cursor-default p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <Eyebrow className="mb-1.5">Resumen financiero</Eyebrow>
                <h2 className="font-display text-[16px] font-medium tracking-[-0.01em] text-fg">
                  Junio 2026
                </h2>
              </div>
              <a
                href="#"
                className="mt-0.5 flex cursor-pointer items-center gap-1 font-body text-caption text-fg-muted transition-colors hover:text-fg"
              >
                Ver reportes completos
                <CaretRight className="h-3 w-3" weight="bold" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-6 md:grid-cols-5">
              <FinancialStat label="Esperado"           value={fmtLong(KPI_DATA.expectedRevenue)} />
              <FinancialStat label="Recaudado"          value={fmtLong(KPI_DATA.collectedRevenue)} />
              <FinancialStat label="Pendiente"          value={fmt(KPI_DATA.expectedRevenue - KPI_DATA.collectedRevenue)} />
              {/* Only "En mora" gets restrained danger red */}
              <FinancialStat label="En mora"            value={fmt(KPI_DATA.lateCollections)} isRed />
              <FinancialStat label="Dispersiones pend." value={String(KPI_DATA.pendingDispersions)} />
            </div>

            {/* Collection rate progress bar — electric blue (key data) */}
            <div className="mt-6 border-t border-border-faint pt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <MonoLabel>Tasa de recaudo</MonoLabel>
                <span className="font-display text-[13px] font-medium tabular-nums text-fg">
                  {KPI_DATA.collectionRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${KPI_DATA.collectionRate}%` }}
                />
              </div>
            </div>
          </Card>

          {/* ── Footer ── */}
          <p className="mt-14 text-center font-mono text-[10.5px] uppercase tracking-[0.07em] text-fg-subtle">
            Datos actualizados hace 4 minutos · Leasefy DS Preview · @leasefy/cadence
          </p>
        </div>
      </div>
    </div>
  );
}
