"use client";

import { Check, ArrowRight } from "@phosphor-icons/react";
import { MonoLabel } from "@leasefy/cadence";
import { EyebrowPill, Reveal, lpHeading } from "./_kit";

const SOLVES = [
  { label: "menos seguimiento manual de pagos", icon: Check },
  { label: "menos comprobantes perdidos", icon: Check },
  { label: "mejor control de mora", icon: Check },
  { label: "más claridad para propietarios", icon: ArrowRight },
  { label: "conciliación más ordenada", icon: ArrowRight },
  { label: "reportes operativos más confiables", icon: ArrowRight },
];

const STATS = [
  { label: "Recaudo del mes", value: "$48.250.000" },
  { label: "Al día", value: "94%" },
  { label: "En mora", value: "6%" },
];

// 12 meses — alturas variadas (%). El último mes resaltado en primary.
const BARS = [38, 52, 44, 61, 48, 70, 57, 66, 73, 62, 81, 88];

const DETAILS = [
  { dot: "bg-success-500", label: "Pagos conciliados", value: "312" },
  { dot: "bg-warning-500", label: "Pendientes de conciliar", value: "18" },
  { dot: "bg-success-500", label: "Pagos a propietarios", value: "al día" },
];

export default function FinanceSection() {
  return (
    <section className="bg-white py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* IZQUIERDA — copy + bullets */}
          <Reveal>
            <EyebrowPill>Operación financiera</EyebrowPill>
            <h2 className={`${lpHeading} mt-7 text-fg`}>
              Controla cobros, cartera y{" "}
              <span className="text-fg-subtle">pagos a propietarios</span>
            </h2>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-fg-muted md:text-lg">
              Centraliza la operación financiera de tus arriendos: pagos de inquilinos,
              mora, recordatorios, conciliación, comisiones, propietarios y reportes.
            </p>

            <MonoLabel className="mt-10 block tracking-[0.16em] text-fg-subtle">
              Qué resuelve
            </MonoLabel>
            <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {SOLVES.map((s) => (
                <li key={s.label} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-50">
                    <s.icon className="h-3.5 w-3.5 text-primary" weight="bold" />
                  </span>
                  <span className="text-[15px] leading-relaxed text-fg-muted">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* DERECHA — light finance mock (surface-muted frame, hairline card) */}
          <Reveal delay={0.1}>
            <div className="rounded-[24px] bg-surface-muted p-3">
              <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
                <MonoLabel className="block tracking-[0.16em] text-fg-subtle">
                  Resumen de cartera
                </MonoLabel>

                {/* Stats */}
                <div className="mt-5 grid grid-cols-3 gap-4 border-b border-border pb-5">
                  {STATS.map((s) => (
                    <div key={s.label}>
                      <p className="text-[11px] leading-tight text-fg-muted">
                        {s.label}
                      </p>
                      <p className="mt-1.5 font-mono text-[15px] font-medium tabular-nums tracking-tight text-fg">
                        {s.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Mini bar chart */}
                <div className="mt-6">
                  <div className="flex h-28 items-end gap-1.5">
                    {BARS.map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${
                          i === BARS.length - 1 ? "bg-primary" : "bg-border"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-fg-muted">
                    Recaudo — últimos 12 meses
                  </p>
                </div>

                {/* Detalle */}
                <div className="mt-6 space-y-3 border-t border-border pt-5">
                  {DETAILS.map((d) => (
                    <div
                      key={d.label}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${d.dot}`} />
                        <span className="text-[13px] text-fg-muted">
                          {d.label}
                        </span>
                      </span>
                      <span className="font-mono text-[13px] font-medium tabular-nums text-fg">
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
