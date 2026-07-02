"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { CheckCircle, ArrowRight, Clock } from "@phosphor-icons/react";
import { MonoLabel } from "@leasefy/cadence";
import { Reveal, ProgressLine, useAutoTabs, lpHeading } from "./_kit";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * NCProblemSplit — NewsCatcher "Conventional search creates extra work":
 * centered heading + a 2-column split. LEFT = a numbered accordion that
 * AUTO-ADVANCES every 7s (Webflow w-tabs signature) with a progress hairline
 * under the active item; clicking selects + resets the timer, hover pauses it.
 * RIGHT = a product mockup that SWAPS per active item and staggers its parts in.
 */

const DWELL = 7; // seconds per item — matches the live site's `progressLine` 7s

const ITEMS = [
  {
    n: "01",
    title: "Solicitudes que se enfrían",
    body: "Cada interesado llega por WhatsApp. Si respondes tarde, ya cerró con otra inmobiliaria.",
  },
  {
    n: "02",
    title: "Cartera en Excel",
    body: "La mora vive en hojas de cálculo: pagos marcados que no entraron y sorpresas a fin de mes.",
  },
  {
    n: "03",
    title: "Evaluación a mano",
    body: "Estudios de inquilino sin trazabilidad ni señales claras de riesgo.",
  },
] as const;

/* ── Shared mockup chrome ──────────────────────────────────────────────────── */

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

function MockShell({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
      className="absolute inset-0 flex flex-col justify-center p-6 md:p-8"
    >
      {children}
    </motion.div>
  );
}

/* 01 — Matching: incoming solicitud → compatible inmueble */
function MatchMock() {
  const cards = [
    { name: "Familia Pérez", budget: "$2.0M" },
    { name: "J. Ramírez", budget: "$1.4M" },
    { name: "A. Gómez", budget: "$2.6M" },
  ];
  return (
    <MockShell>
      <motion.div variants={rise} className="flex justify-center">
        <MonoLabel className="rounded-[4px] bg-primary px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-white">
          Match 94% · Chapinero
        </MonoLabel>
      </motion.div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <motion.div
            key={c.name}
            variants={rise}
            className="rounded-lg border border-neutral-200 bg-white p-3"
          >
            <MonoLabel className="text-[10px] tracking-[0.12em] text-fg-subtle">
              Solicitud
            </MonoLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-[4px] bg-indigo-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-primary">
                {c.name}
              </span>
              <span className="rounded-[4px] bg-indigo-50 px-1.5 py-0.5 font-mono text-[9px] font-medium text-primary">
                {c.budget}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              <span className="block h-1.5 w-full rounded-full bg-neutral-100" />
              <span className="block h-1.5 w-3/4 rounded-full bg-neutral-100" />
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div variants={rise} className="mt-5 flex items-center justify-center gap-3">
        {cards.map((c) => (
          <CheckCircle key={c.name} className="h-5 w-5 text-primary" weight="fill" />
        ))}
      </motion.div>
      <motion.p variants={rise} className="mt-5">
        <MonoLabel className="flex items-center justify-center gap-2 tracking-wide text-fg-subtle">
          Solicitud <ArrowRight className="h-3 w-3 text-primary" weight="bold" /> Inmueble compatible
        </MonoLabel>
      </motion.p>
    </MockShell>
  );
}

/* 02 — Cobranza: cartera with live statuses + recaudado bar */
function CarteraMock() {
  const rows = [
    { name: "Familia Pérez", tag: "Al día", tone: "ok" as const },
    { name: "J. Ramírez", tag: "Mora 3 días", tone: "warn" as const },
    { name: "A. Gómez", tag: "Recordatorio enviado", tone: "sent" as const },
  ];
  const toneCls = {
    ok: "bg-success-50 text-success-700",
    warn: "bg-warning-50 text-warning-700",
    sent: "bg-indigo-50 text-primary",
  };
  return (
    <MockShell>
      <motion.div variants={rise} className="flex items-center justify-between">
        <MonoLabel className="text-[10px] tracking-[0.12em] text-fg-subtle">
          Cartera · junio
        </MonoLabel>
        <MonoLabel className="text-[10px] tracking-[0.12em] text-fg-subtle">
          Recaudado 82%
        </MonoLabel>
      </motion.div>
      <motion.div variants={rise} className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
        <motion.span
          className="block h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: "82%" }}
          transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </motion.div>
      <div className="mt-5 space-y-2.5">
        {rows.map((r) => (
          <motion.div
            key={r.name}
            variants={rise}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3.5 py-3"
          >
            <span className="text-[13px] text-neutral-700">{r.name}</span>
            <MonoLabel
              className={`rounded-[4px] px-2 py-0.5 text-[10px] font-medium tracking-wide ${toneCls[r.tone]}`}
            >
              {r.tag}
            </MonoLabel>
          </motion.div>
        ))}
      </div>
      <motion.p variants={rise} className="mt-5">
        <MonoLabel className="flex items-center justify-center gap-2 tracking-wide text-fg-subtle">
          <Clock className="h-3 w-3 text-primary" weight="bold" /> El agente cobra solo
        </MonoLabel>
      </motion.p>
    </MockShell>
  );
}

/* 03 — Estudio: tenant risk scorecard */
function EstudioMock() {
  const checks = ["Identidad verificada", "Ingresos validados", "Historial al día"];
  return (
    <MockShell>
      <motion.div variants={rise} className="flex items-center justify-between">
        <div>
          <MonoLabel className="text-[10px] tracking-[0.12em] text-fg-subtle">
            Estudio · J. Ramírez
          </MonoLabel>
          <p className="mt-1 font-heading text-[26px] font-medium leading-none text-neutral-950">
            Riesgo bajo
          </p>
        </div>
        <MonoLabel className="rounded-[4px] bg-success-50 px-2.5 py-1 text-[11px] font-medium tracking-wide text-success-700">
          Aprobable
        </MonoLabel>
      </motion.div>

      <motion.div variants={rise} className="mt-5 space-y-3">
        {[
          { label: "Ingresos / arriendo", pct: 88 },
          { label: "Estabilidad laboral", pct: 72 },
        ].map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-neutral-500">{b.label}</span>
              <span className="font-mono text-[11px] tabular-nums text-neutral-700">{b.pct}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-neutral-100">
              <motion.span
                className="block h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${b.pct}%` }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </motion.div>

      <motion.ul variants={rise} className="mt-5 space-y-2">
        {checks.map((c) => (
          <li key={c} className="flex items-center gap-2 text-[13px] text-neutral-700">
            <CheckCircle className="h-4 w-4 shrink-0 text-primary" weight="fill" />
            {c}
          </li>
        ))}
      </motion.ul>
    </MockShell>
  );
}

const MOCKS = [MatchMock, CarteraMock, EstudioMock];

export default function NCProblemSplit() {
  const [active, setActive] = useAutoTabs(ITEMS.length, { interval: DWELL * 1000 });
  const Mock = MOCKS[active];

  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container-platform">
        <Reveal>
          <h2 className={`${lpHeading} mx-auto max-w-3xl text-center text-neutral-950`}>
            La operación manual multiplica el trabajo
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 items-center gap-12 md:mt-20 lg:grid-cols-2 lg:gap-16">
          {/* LEFT — auto-advancing numbered accordion */}
          <Reveal>
            <div>
              {ITEMS.map((item, i) => {
                const isActive = active === i;
                return (
                  <div key={item.n} className="border-t border-neutral-200 last:border-b">
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      aria-expanded={isActive}
                      className="group flex w-full items-baseline gap-5 pt-7 pb-5 text-left"
                    >
                      <span className="font-mono text-[14px] tabular-nums text-neutral-400">
                        {item.n}
                      </span>
                      <span
                        className={`font-heading text-[26px] font-medium leading-[1.1] tracking-[-0.02em] transition-colors duration-300 md:text-[34px] ${
                          isActive
                            ? "text-neutral-950"
                            : "text-neutral-300 group-hover:text-neutral-500"
                        }`}
                      >
                        {item.title}
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="pb-6 pl-[3.25rem] pr-6 text-[15px] leading-relaxed text-neutral-500">
                            {item.body}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* progress hairline under the active item */}
                    <ProgressLine
                      active={isActive}
                      duration={DWELL}
                      cycleKey={active}
                      className="mb-[-1px] bg-transparent"
                    />
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* RIGHT — mockup that swaps per active item */}
          <Reveal delay={0.1}>
            <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
              {/* hairline frame ticks */}
              <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-neutral-300" />
              <span aria-hidden className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-neutral-300" />
              <span aria-hidden className="pointer-events-none absolute left-3 bottom-3 h-3 w-3 border-l border-b border-neutral-300" />
              <span aria-hidden className="pointer-events-none absolute right-3 bottom-3 h-3 w-3 border-r border-b border-neutral-300" />
              <AnimatePresence mode="wait">
                <Mock key={active} />
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
