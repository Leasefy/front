"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Coins,
  Umbrella,
  IdentificationCard,
  Path,
  ArrowsClockwise,
  HouseLine,
  Wallet,
  CalendarCheck,
  CheckCircle,
  ArrowRight,
  Sparkle,
  type Icon,
} from "@phosphor-icons/react";
import { MonoLabel } from "@leasefy/cadence";
import { EyebrowPill, lpHeading, Reveal } from "../_kit";

/* ── Agent roster ─────────────────────────────────────────────────────────── */

type AgentId =
  | "cobranza"
  | "asegurabilidad"
  | "estudio"
  | "matching"
  | "conciliacion"
  | "avaluos"
  | "pagos"
  | "retencion";

const AGENTS: { id: AgentId; name: string; desc: string; icon: Icon }[] = [
  {
    id: "cobranza",
    name: "Cobranza",
    desc: "Recordatorios, mora, acuerdos y cobros en todos los canales.",
    icon: Coins,
  },
  {
    id: "asegurabilidad",
    name: "Asegurabilidad",
    desc: "Cotiza pólizas y fianzas, compara aseguradoras y define si un candidato avanza.",
    icon: Umbrella,
  },
  {
    id: "estudio",
    name: "Estudio de inquilino",
    desc: "Evalúa documentos, capacidad de pago y señales de riesgo antes de firmar.",
    icon: IdentificationCard,
  },
  {
    id: "matching",
    name: "Matching",
    desc: "Conecta cada solicitud con los inmuebles compatibles por presupuesto, zona y perfil.",
    icon: Path,
  },
  {
    id: "conciliacion",
    name: "Conciliación",
    desc: "Cruza pagos, bancos y contratos para cerrar la cartera sin reprocesos.",
    icon: ArrowsClockwise,
  },
  {
    id: "avaluos",
    name: "Avalúos",
    desc: "Estima valor de arriendo o venta con comparables y racionales claros.",
    icon: HouseLine,
  },
  {
    id: "pagos",
    name: "Pagos",
    desc: "Cobros a inquilinos y pagos a propietarios, con orden y trazabilidad.",
    icon: Wallet,
  },
  {
    id: "retencion",
    name: "Retención",
    desc: "Anticipa renovaciones, detecta propietarios en riesgo y reduce la vacancia.",
    icon: CalendarCheck,
  },
];

/** Per-agent outcome strip shown at the foot of the live preview. */
const OUTCOMES: Record<AgentId, { icon: Icon; text: string }> = {
  cobranza: { icon: CheckCircle, text: "Acuerdo de pago confirmado por WhatsApp" },
  asegurabilidad: { icon: CheckCircle, text: "Aseguradora elegida · candidato aprobado" },
  estudio: { icon: CheckCircle, text: "Estudio aprobado · perfil de bajo riesgo" },
  matching: { icon: CheckCircle, text: "3 inmuebles compatibles enviados al asesor" },
  conciliacion: { icon: CheckCircle, text: "Cartera cuadrada · cero reprocesos" },
  avaluos: { icon: CheckCircle, text: "Avalúo estimado con 12 comparables" },
  pagos: { icon: CheckCircle, text: "Desembolso enviado al propietario" },
  retencion: { icon: CheckCircle, text: "Renovación iniciada con 28 días de anticipación" },
};

/* ── Tiny shared preview primitives ───────────────────────────────────────── */

function PreviewHead({ icon: I, title, live }: { icon: Icon; title: string; live?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border-faint px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-[0_6px_16px_-6px_rgba(26,64,255,0.6)]">
          <I className="h-[18px] w-[18px]" weight="fill" />
        </span>
        <div className="leading-tight">
          <p className="font-heading text-[15px] font-semibold text-fg">{title}</p>
          <p className="text-[11px] text-fg-subtle">Actividad en vivo</p>
        </div>
      </div>
      {live && (
        <span className="flex items-center gap-2 rounded-full border border-success-100 bg-success-50 px-2.5 py-1 text-[11px] font-medium text-success-700">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success-500" />
          </span>
          {live}
        </span>
      )}
    </div>
  );
}

function Bar({ pct, tone = "primary" }: { pct: number; tone?: "primary" | "success" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={tone === "success" ? "h-full rounded-full bg-success-500" : "h-full rounded-full bg-primary"}
      />
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" }) {
  const map = {
    neutral: "bg-surface-muted text-fg-muted",
    success: "bg-success-50 text-success-700",
    warning: "bg-warning-50 text-warning-700",
  } as const;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}

/* ── Per-agent previews ───────────────────────────────────────────────────── */

function CobranzaPreview() {
  const rows = [
    { name: "C. Ramírez — Apto 502", amount: "$1.450.000", state: "Promesa hoy", tone: "warning" as const },
    { name: "M. Torres — Casa 14", amount: "$2.100.000", state: "Pagó", tone: "success" as const },
    { name: "J. Gómez — Apto 301", amount: "$980.000", state: "Acuerdo", tone: "neutral" as const },
  ];
  return (
    <div>
      <PreviewHead icon={Coins} title="Agente de cobranza" live="En vivo" />
      <div className="p-5">
        <MonoLabel className="mb-3 block text-[11px] tracking-[0.14em] text-fg-subtle">
          Promesas de pago · hoy
        </MonoLabel>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-xl border border-border-faint px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-fg">{r.name}</p>
                <p className="font-mono text-[12px] tabular-nums text-fg-muted">{r.amount}</p>
              </div>
              <Pill tone={r.tone}>{r.state}</Pill>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AsegurabilidadPreview() {
  const opts = [
    { name: "Seguros Bolívar", prima: "$84.000", best: true },
    { name: "SURA", prima: "$91.500", best: false },
    { name: "Liberty", prima: "$97.200", best: false },
  ];
  return (
    <div>
      <PreviewHead icon={Umbrella} title="Asegurabilidad" live="Apto" />
      <div className="p-5">
        <MonoLabel className="mb-3 block text-[11px] tracking-[0.14em] text-fg-subtle">
          Comparativa de aseguradoras
        </MonoLabel>
        <div className="space-y-2">
          {opts.map((o) => (
            <div
              key={o.name}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                o.best ? "border-primary/30 bg-indigo-50/40" : "border-border-faint"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[13px] font-medium text-fg">{o.name}</span>
                {o.best && <Pill tone="success">Recomendada</Pill>}
              </div>
              <span className="font-mono text-[13px] tabular-nums text-fg-muted">{o.prima}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EstudioPreview() {
  const signals = [
    { label: "Capacidad de pago", pct: 88 },
    { label: "Historial crediticio", pct: 74 },
    { label: "Estabilidad laboral", pct: 92 },
  ];
  return (
    <div>
      <PreviewHead icon={IdentificationCard} title="Estudio de inquilino" live="Aprobado" />
      <div className="p-5">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <MonoLabel className="block text-[11px] tracking-[0.14em] text-fg-subtle">Score</MonoLabel>
            <p className="font-mono text-4xl tabular-nums leading-none text-fg">847</p>
          </div>
          <Pill tone="success">Bajo riesgo</Pill>
        </div>
        <div className="space-y-3.5">
          {signals.map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[12px] text-fg-muted">{s.label}</span>
                <span className="font-mono text-[12px] tabular-nums text-fg-subtle">{s.pct}%</span>
              </div>
              <Bar pct={s.pct} tone="success" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MatchingPreview() {
  return (
    <div>
      <PreviewHead icon={Path} title="Matching" live="3 compatibles" />
      <div className="p-5">
        <MonoLabel className="mb-3 block text-[11px] tracking-[0.14em] text-fg-subtle">
          Solicitud → Inmueble
        </MonoLabel>
        <div className="rounded-2xl border border-border-faint p-4">
          <div className="flex items-center gap-3 text-[13px]">
            <div className="flex-1">
              <p className="font-medium text-fg">Familia Pérez</p>
              <p className="font-mono text-[11px] text-fg-muted">$2.0M · Chapinero · 3 hab</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-fg-subtle" weight="bold" />
            <div className="flex-1 text-right">
              <p className="font-medium text-fg">Apto 704</p>
              <p className="font-mono text-[11px] text-fg-muted">$1.95M · Chapinero</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] text-fg-muted">Compatibilidad</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums text-primary">94%</span>
            </div>
            <Bar pct={94} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConciliacionPreview() {
  const rows = [
    { ref: "Bancolombia · ref 8842", amount: "$1.450.000" },
    { ref: "Nequi · ref 1190", amount: "$980.000" },
    { ref: "Davivienda · ref 5521", amount: "$2.100.000" },
  ];
  return (
    <div>
      <PreviewHead icon={ArrowsClockwise} title="Conciliación" live="Cuadrado" />
      <div className="p-5">
        <MonoLabel className="mb-3 block text-[11px] tracking-[0.14em] text-fg-subtle">
          Pagos cruzados con contratos
        </MonoLabel>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.ref} className="flex items-center justify-between rounded-xl border border-border-faint px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle className="h-4 w-4 shrink-0 text-success-500" weight="fill" />
                <span className="truncate text-[12px] text-fg-muted">{r.ref}</span>
              </div>
              <span className="font-mono text-[12px] tabular-nums text-fg">{r.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AvaluosPreview() {
  return (
    <div>
      <PreviewHead icon={HouseLine} title="Avalúos" live="Estimado" />
      <div className="p-5">
        <MonoLabel className="block text-[11px] tracking-[0.14em] text-fg-subtle">
          Valor de arriendo · Apto 704
        </MonoLabel>
        <p className="mt-1 font-mono text-4xl tabular-nums leading-none text-fg">$1.98M</p>
        <p className="mt-2 text-[12px] text-fg-muted">Banda estimada según 12 comparables</p>
        <div className="mt-5">
          <div className="relative h-2 w-full rounded-full bg-surface-muted">
            <div className="absolute inset-y-0 left-[22%] right-[18%] rounded-full bg-indigo-50" />
            <motion.span
              initial={{ left: "22%" }}
              animate={{ left: "58%" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow"
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-fg-subtle">
            <span>$1.7M</span>
            <span>$2.3M</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PagosPreview() {
  return (
    <div>
      <PreviewHead icon={Wallet} title="Pagos" live="Procesado" />
      <div className="p-5">
        <MonoLabel className="mb-3 block text-[11px] tracking-[0.14em] text-fg-subtle">
          Desembolso a propietario
        </MonoLabel>
        <div className="rounded-2xl border border-border-faint p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-fg">Laura Mendoza</span>
            <Pill tone="success">Enviado</Pill>
          </div>
          <p className="mt-3 font-mono text-3xl tabular-nums leading-none text-fg">$1.840.000</p>
          <div className="mt-4 space-y-1.5 text-[11px] tracking-wide text-fg-subtle">
            <MonoLabel className="block">Recaudo $2.000.000 · admin -$160.000</MonoLabel>
            <MonoLabel className="block">Cuenta ····4821 · Bancolombia</MonoLabel>
          </div>
        </div>
      </div>
    </div>
  );
}

function RetencionPreview() {
  return (
    <div>
      <PreviewHead icon={CalendarCheck} title="Retención" live="2 por vencer" />
      <div className="p-5">
        <MonoLabel className="mb-3 block text-[11px] tracking-[0.14em] text-fg-subtle">
          Contratos por vencer
        </MonoLabel>
        <div className="space-y-2">
          <div className="rounded-xl border border-border-faint px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-fg">Apto 502 · C. Ramírez</span>
              <Pill tone="warning">28 días</Pill>
            </div>
            <p className="mt-1 text-[12px] text-fg-muted">Propietario en riesgo de retiro</p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-indigo-50/40 px-4 py-3">
            <span className="text-[13px] font-medium text-fg">Iniciar renovación</span>
            <ArrowRight className="h-4 w-4 text-primary" weight="bold" />
          </div>
        </div>
      </div>
    </div>
  );
}

const PREVIEWS: Record<AgentId, () => JSX.Element> = {
  cobranza: CobranzaPreview,
  asegurabilidad: AsegurabilidadPreview,
  estudio: EstudioPreview,
  matching: MatchingPreview,
  conciliacion: ConciliacionPreview,
  avaluos: AvaluosPreview,
  pagos: PagosPreview,
  retencion: RetencionPreview,
};

/* ── Section ──────────────────────────────────────────────────────────────── */

export default function AgentsShowcaseA() {
  const [active, setActive] = useState<AgentId>("cobranza");
  const [auto, setAuto] = useState(true);
  const Preview = PREVIEWS[active];
  const outcome = OUTCOMES[active];
  const OutcomeIcon = outcome.icon;
  const activeIndex = AGENTS.findIndex((a) => a.id === active);

  // Self-demoing auto-advance — stops permanently the first time the user picks one.
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setActive((cur) => {
        const i = AGENTS.findIndex((a) => a.id === cur);
        return AGENTS[(i + 1) % AGENTS.length].id;
      });
    }, 4200);
    return () => clearInterval(t);
  }, [auto]);

  function pick(id: AgentId) {
    setAuto(false);
    setActive(id);
  }

  return (
    <section className="relative overflow-hidden lp-band-top py-20 md:py-28">
      {/* soft ambient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 78% 18%, rgba(26,64,255,0.06), transparent 70%)",
        }}
      />

      <div className="container-platform relative">
        <Reveal>
          <EyebrowPill>Agentes AI</EyebrowPill>
          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2 className={`${lpHeading} max-w-3xl text-fg`}>
              Un agente para cada momento del arriendo.
            </h2>
            <p className="hidden shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-[13px] text-fg-muted md:inline-flex">
              <Sparkle className="h-4 w-4 text-primary" weight="fill" />
              8 agentes · 1 plataforma
            </p>
          </div>
          <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-fg-muted md:text-lg">
            Ocho agentes especializados que operan tu inmobiliaria de punta a punta —del primer
            contacto al pago al propietario. Elige uno y mira cómo trabaja.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <div className="grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
            {/* LEFT — numbered accordion list */}
            <div role="listbox" aria-label="Agentes AI" className="flex flex-col gap-1.5">
              {AGENTS.map((a, i) => {
                const I = a.icon;
                const isActive = a.id === active;
                return (
                  <motion.button
                    layout
                    key={a.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => pick(a.id)}
                    transition={{ layout: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
                    className={`group relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                      isActive
                        ? "border-border/80 bg-surface shadow-[0_12px_32px_-18px_rgba(15,23,42,0.25)]"
                        : "border-transparent hover:bg-white/70"
                    }`}
                  >
                    {/* active accent rail */}
                    {isActive && (
                      <motion.span
                        layoutId="agentRail"
                        className="absolute inset-y-2 left-0 w-1 rounded-full bg-primary"
                      />
                    )}

                    <span
                      className={`mt-0.5 font-mono text-[12px] tabular-nums transition-colors ${
                        isActive ? "text-primary" : "text-fg-subtle group-hover:text-fg-muted"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                        isActive
                          ? "bg-primary text-white shadow-[0_8px_20px_-8px_rgba(26,64,255,0.7)]"
                          : "bg-surface text-fg-subtle ring-1 ring-border group-hover:text-primary"
                      }`}
                    >
                      <I className="h-5 w-5" weight={isActive ? "fill" : "regular"} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={`font-heading text-[15px] font-semibold transition-colors ${
                            isActive ? "text-fg" : "text-fg-muted"
                          }`}
                        >
                          {a.name}
                        </span>
                        <ArrowRight
                          className={`h-3.5 w-3.5 text-primary transition-all ${
                            isActive ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"
                          }`}
                          weight="bold"
                        />
                      </span>

                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.span
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            className="block overflow-hidden"
                          >
                            <span className="mt-1 block text-[13px] leading-snug text-fg-muted">
                              {a.desc}
                            </span>
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* RIGHT — live product preview, floating with a soft glow */}
            <div className="lg:sticky lg:top-24">
              <div className="relative">
                {/* indigo glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px] opacity-70 blur-2xl"
                  style={{
                    background:
                      "radial-gradient(50% 45% at 50% 30%, rgba(26,64,255,0.18), transparent 75%)",
                  }}
                />

                <div className="rounded-[26px] border border-border/70 bg-surface/70 p-3 backdrop-blur-sm">
                  <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_30px_70px_-30px_rgba(15,23,42,0.28)]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={active}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Preview />

                        {/* outcome strip */}
                        <div className="flex items-center justify-between gap-3 border-t border-border-faint bg-surface-muted/60 px-5 py-3.5">
                          <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-fg-muted">
                            <OutcomeIcon className="h-4 w-4 shrink-0 text-success-500" weight="fill" />
                            <span className="truncate">{outcome.text}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-fg-subtle ring-1 ring-border">
                            Automático
                          </span>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                {/* progress dots */}
                <div className="mt-5 flex items-center justify-center gap-1.5">
                  {AGENTS.map((a, i) => (
                    <button
                      key={a.id}
                      type="button"
                      aria-label={`Ver ${a.name}`}
                      onClick={() => pick(a.id)}
                      className="group/dot p-1.5"
                    >
                      <span
                        className={`block h-1.5 rounded-full transition-all ${
                          i === activeIndex
                            ? "w-6 bg-primary"
                            : "w-1.5 bg-fg-subtle group-hover/dot:bg-fg-muted"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
