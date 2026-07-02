"use client";

import { useEffect, useState } from "react";
import { motion, animate } from "framer-motion";
import { MonoLabel } from "@leasefy/cadence";
import {
  ChatText,
  Kanban,
  Monitor,
  UsersThree,
  Buildings,
  Stack,
  Lightning,
  ShieldCheck,
  Sparkle,
  type Icon,
} from "@phosphor-icons/react";
import { EyebrowPill, Reveal, ProgressLine, useAutoTabs, lpHeading } from "./_kit";

/* NewsCatcher "When accuracy, speed, and scale matter": auto-advancing dimension
   tabs (left, with a progress hairline + accent) and a bars panel (right) that
   re-grows in a cascade on every tab change, with count-up percentages and a
   sheen sweeping the winning Leasefy bar. Illustrative — not a benchmark. */

type DimId = "cobertura" | "automatizacion" | "trazabilidad";

const DWELL = 6; // seconds per dimension
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const DIMENSIONS: {
  id: DimId;
  label: string;
  desc: string;
  icon: Icon;
  takeaway: string;
}[] = [
  {
    id: "cobertura",
    label: "Cobertura",
    desc: "Qué tanto del ciclo del arriendo cubre, de la solicitud a la retención.",
    icon: Stack,
    takeaway: "Leasefy cubre el ciclo completo —de la solicitud a la retención— en un solo lugar.",
  },
  {
    id: "automatizacion",
    label: "Automatización",
    desc: "Cuánto del trabajo repetitivo elimina sin sumar más personas.",
    icon: Lightning,
    takeaway: "Los agentes ejecutan el trabajo repetitivo solos, sin sumar más personas.",
  },
  {
    id: "trazabilidad",
    label: "Trazabilidad",
    desc: "Qué tanto de cada decisión y cobro queda registrado y auditable.",
    icon: ShieldCheck,
    takeaway: "Cada decisión y cada cobro queda registrado y auditable, sin Excel paralelos.",
  },
];

const ROWS: {
  name: string;
  icon: Icon;
  leasefy?: boolean;
  v: Record<DimId, number>;
}[] = [
  { name: "WhatsApp + Excel", icon: ChatText, v: { cobertura: 25, automatizacion: 12, trazabilidad: 15 } },
  { name: "CRM genérico", icon: Kanban, v: { cobertura: 45, automatizacion: 32, trazabilidad: 50 } },
  { name: "Software tradicional", icon: Monitor, v: { cobertura: 62, automatizacion: 46, trazabilidad: 66 } },
  { name: "Equipo grande (manual)", icon: UsersThree, v: { cobertura: 100, automatizacion: 8, trazabilidad: 42 } },
  { name: "Leasefy", icon: Buildings, leasefy: true, v: { cobertura: 90, automatizacion: 92, trazabilidad: 100 } },
];

/* Number that animates 0→value whenever `value` changes (tab switch). */
function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      delay,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, delay]);
  return <>{display}%</>;
}

export default function ComparisonSection() {
  const [paused, setPaused] = useState(false);
  const [idx, setIdx] = useAutoTabs(DIMENSIONS.length, { interval: DWELL * 1000, paused });
  const active = DIMENSIONS[idx];
  const dim = active.id;

  return (
    <section className="bg-white py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>Por qué Leasefy</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-7 text-neutral-950`}>
            Una plataforma completa, no herramientas sueltas.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-neutral-500 md:text-lg">
            Un equipo grande puede cubrir toda la operación —pero a un costo alto. Mira qué
            tanto cubre cada enfoque.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <div
            className="grid gap-6 lg:grid-cols-[300px_1fr]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* ── dimension tabs ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              {DIMENSIONS.map((d, i) => {
                const on = idx === i;
                const I = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setIdx(i)}
                    className={`group relative overflow-hidden rounded-xl border p-5 pl-6 text-left transition-all duration-300 ${
                      on
                        ? "border-neutral-300 bg-white shadow-[0_8px_24px_-16px_rgba(16,24,64,0.35)]"
                        : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/60"
                    }`}
                  >
                    {/* left accent bar */}
                    <span
                      className={`pointer-events-none absolute left-0 top-0 h-full w-[3px] origin-top bg-primary transition-transform duration-300 ${
                        on ? "scale-y-100" : "scale-y-0"
                      }`}
                    />
                    <span className="flex items-center gap-2.5">
                      <I
                        className={`h-4 w-4 shrink-0 transition-colors ${on ? "text-primary" : "text-neutral-400 group-hover:text-neutral-600"}`}
                        weight={on ? "fill" : "regular"}
                      />
                      <MonoLabel
                        className={`text-[11px] tracking-[0.12em] transition-colors ${
                          on ? "text-primary" : "text-neutral-400 group-hover:text-neutral-600"
                        }`}
                      >
                        {d.label}
                      </MonoLabel>
                    </span>
                    <span className="mt-2 block text-[13px] leading-relaxed text-neutral-500">
                      {d.desc}
                    </span>
                    <ProgressLine
                      active={on}
                      duration={DWELL}
                      paused={paused}
                      cycleKey={idx}
                      className="mt-4 bg-neutral-200/70"
                    />
                  </button>
                );
              })}
            </div>

            {/* ── bars panel ─────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-neutral-200 p-5 md:p-7">
              {/* panel header — dynamic takeaway per dimension */}
              <div className="flex items-start gap-3 border-b border-neutral-100 pb-5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-indigo-50 text-primary">
                  <active.icon className="h-4 w-4" weight="fill" />
                </span>
                <div className="min-w-0">
                  <MonoLabel className="text-[10px] tracking-[0.14em] text-fg-subtle">
                    {active.label}
                  </MonoLabel>
                  <motion.p
                    key={dim}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="mt-1 text-[14px] leading-snug text-neutral-700 md:text-[15px]"
                  >
                    {active.takeaway}
                  </motion.p>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                {ROWS.map((r, ri) => {
                  const pct = r.v[dim];
                  const I = r.icon;
                  const delay = ri * 0.08;
                  return (
                    <div
                      key={r.name}
                      className={`relative flex items-center gap-3 rounded-xl px-3 py-3.5 transition-colors md:gap-4 ${
                        r.leasefy ? "bg-indigo-50/60 ring-1 ring-primary/15" : ""
                      }`}
                    >
                      <div className="flex w-36 shrink-0 items-center gap-2.5 md:w-52">
                        <I
                          className={`h-[18px] w-[18px] shrink-0 ${r.leasefy ? "text-primary" : "text-neutral-400"}`}
                          weight={r.leasefy ? "fill" : "regular"}
                        />
                        <span
                          className={`truncate text-[13px] md:text-[13.5px] ${
                            r.leasefy ? "font-medium text-neutral-950" : "text-neutral-600"
                          }`}
                        >
                          {r.name}
                        </span>
                        {r.leasefy && (
                          <MonoLabel className="hidden items-center gap-1 rounded-[4px] bg-primary px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-white sm:inline-flex">
                            <Sparkle className="h-2.5 w-2.5" weight="fill" /> Mejor
                          </MonoLabel>
                        )}
                      </div>

                      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
                        <motion.div
                          key={dim + r.name}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay, ease: EASE }}
                          className="relative h-full overflow-hidden rounded-full"
                          style={{
                            background: r.leasefy
                              ? "linear-gradient(90deg, #1A40FF, #3a5cff)"
                              : "linear-gradient(90deg, #1A40FF, #c3ccf9)",
                          }}
                        >
                          {/* sheen sweep — only on the winning bar */}
                          {r.leasefy && (
                            <span
                              aria-hidden
                              className="absolute inset-y-0 left-0 w-1/3"
                              style={{
                                background:
                                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)",
                                animation: "lpSheen 3.4s ease-in-out infinite",
                                animationDelay: "0.9s",
                              }}
                            />
                          )}
                        </motion.div>
                      </div>

                      <span
                        className={`w-11 shrink-0 text-right font-mono text-[13px] tabular-nums ${
                          r.leasefy ? "font-medium text-primary" : "text-neutral-700"
                        }`}
                      >
                        <CountUp value={pct} delay={delay} />
                      </span>
                    </div>
                  );
                })}
              </div>

              <MonoLabel className="mt-5 block px-3 text-[10px] tracking-[0.12em] text-neutral-400">
                Comparación ilustrativa de enfoques · no es un benchmark
              </MonoLabel>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
