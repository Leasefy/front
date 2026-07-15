"use client";

/**
 * NCTagCloud — NewsCatcher "Navigating news with context" section, ported to Leasefy.
 *
 * Centered big heading + two infinite marquee rows of agent tag pills.
 * Each pill: light bordered shell + indigo mono chip (agent name) + gray label.
 * White fade masks bleed over the marquee edges. Everything light, no dark.
 */

import { MonoLabel } from "@leasefy/cadence";

import { lpHeading, Marquee, Reveal } from "./_kit";
import { cn } from "@/lib/utils";

type Tag = { agent: string; label: string };

const ROW_ONE: Tag[] = [
  { agent: "Cobranza", label: "recordatorios y acuerdos" },
  { agent: "Matching", label: "inmuebles compatibles" },
  { agent: "Estudio", label: "evaluación de inquilinos" },
  { agent: "Asegurabilidad", label: "pólizas y fianzas" },
];

const ROW_TWO: Tag[] = [
  { agent: "Conciliación", label: "pagos y bancos" },
  { agent: "Avalúos", label: "valor de arriendo" },
  { agent: "Pagos", label: "a propietarios" },
  { agent: "Retención", label: "renovaciones" },
];

function TagPill({ agent, label }: Tag) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[6px] border border-border bg-surface pr-4 transition-colors duration-300 hover:border-primary/30 hover:bg-indigo-50/30">
      <MonoLabel className="m-1 rounded-[5px] bg-indigo-50 px-2.5 py-1.5 tracking-wide text-primary">
        {agent}
      </MonoLabel>
      <span className="ml-3 text-[15px] text-fg-muted">{label}</span>
    </span>
  );
}

export default function NCTagCloud() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="container-platform">
        <Reveal>
          <h2
            className={cn(
              lpHeading,
              "mx-auto max-w-3xl text-center text-fg"
            )}
          >
            Cada momento del arriendo,
            <br className="hidden sm:block" /> cubierto por un agente
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mt-14 space-y-5">
            {/* left / right white fade masks over the marquee edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent md:w-40" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent md:w-40" />

            <Marquee duration={38} gap="gap-5">
              {ROW_ONE.map((t) => (
                <TagPill key={t.agent} {...t} />
              ))}
            </Marquee>

            <Marquee reverse duration={42} gap="gap-5">
              {ROW_TWO.map((t) => (
                <TagPill key={t.agent} {...t} />
              ))}
            </Marquee>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
