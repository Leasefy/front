"use client";

import {
  ShieldCheck,
  Lock,
  ListChecks,
  Scales,
  UserGear,
  ClockCounterClockwise,
} from "@phosphor-icons/react";
import { EyebrowPill, Reveal, lpHeading } from "./_kit";

const CARDS = [
  {
    icon: ShieldCheck,
    title: "Habeas Data",
    body: "Tratamiento de datos personales diseñado conforme a la Ley 1581, y cobranza alineada a la Ley 2300.",
  },
  {
    icon: Lock,
    title: "Control de accesos por rol",
    body: "Permisos por rol para cada miembro del equipo: cada quien ve y hace solo lo que le corresponde.",
  },
  {
    icon: ListChecks,
    title: "Trazabilidad total",
    body: "Cada decisión, evaluación y cobro queda registrado y auditable de punta a punta.",
  },
];

const BADGES = [
  { label: "Ley 1581", icon: Scales },
  { label: "Ley 2300", icon: Scales },
  { label: "Roles y permisos", icon: UserGear },
  { label: "Registro de auditoría", icon: ClockCounterClockwise },
];

export default function SecuritySection() {
  return (
    <section id="seguridad" className="lp-band-bottom py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* Header */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>Confianza y cumplimiento</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-7 text-fg`}>
            Tu operación con respaldo{" "}
            <span className="text-fg-subtle">y trazabilidad.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg">
            Leasefy maneja datos sensibles de forma responsable y auditable,
            conforme a la normativa colombiana.
          </p>
        </Reveal>

        {/* 3 security features */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={0.05 * i}>
              <div className="group h-full rounded-2xl border border-border bg-surface p-7 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.12)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <c.icon className="h-6 w-6" weight="duotone" />
                </span>
                <h3 className="mt-6 font-heading text-lg font-medium tracking-tight text-fg">
                  {c.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-fg-muted">
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Capability chips */}
        <Reveal delay={0.15} className="mt-12">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {BADGES.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-[13px] text-fg-muted"
              >
                <b.icon className="h-3.5 w-3.5 text-primary" weight="duotone" />
                {b.label}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
