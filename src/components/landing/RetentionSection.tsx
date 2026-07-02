"use client";

import { CalendarCheck, WarningCircle, HouseLine } from "@phosphor-icons/react";
import { EyebrowPill, LpButton, Reveal, lpHeading } from "./_kit";

const CARDS = [
  {
    num: "01",
    icon: CalendarCheck,
    title: "Anticipa renovaciones",
    body: "Identifica contratos próximos a vencer y actúa antes de que el propietario se vaya.",
  },
  {
    num: "02",
    icon: WarningCircle,
    title: "Detecta propietarios en riesgo",
    body: "Señales tempranas de inconformidad o inmuebles a punto de quedar vacíos.",
  },
  {
    num: "03",
    icon: HouseLine,
    title: "Reduce la vacancia",
    body: "Menos inmuebles ociosos y más continuidad en tu portafolio.",
  },
];

export default function RetentionSection() {
  return (
    <section className="lp-band-top py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* Header */}
        <Reveal className="max-w-3xl">
          <EyebrowPill>Retención</EyebrowPill>
          <h2 className={`${lpHeading} mt-7 text-neutral-950`}>
            Retén más inmuebles{" "}
            <span className="text-neutral-400">dentro de tu portafolio.</span>
          </h2>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-neutral-500 md:text-lg">
            Crecer una inmobiliaria no es solo captar más inmuebles: también es
            evitar perder los que ya tienes. Leasefy anticipa renovaciones,
            detecta propietarios en riesgo y mantiene una relación clara con cada
            uno.
          </p>
        </Reveal>

        {/* 3 puntos — hairline 3-up grid (Handle capabilities) */}
        <Reveal delay={0.15} className="mt-14">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-neutral-200 md:grid-cols-3 md:divide-x md:divide-neutral-200">
            {CARDS.map((card) => (
              <div
                key={card.title}
                className="group flex min-h-[260px] flex-col p-8 transition-colors hover:bg-white"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <card.icon className="h-6 w-6" weight="duotone" />
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-neutral-300">
                    {card.num}
                  </span>
                </div>
                <h3 className="mt-6 font-heading text-xl font-medium tracking-tight text-neutral-950">
                  {card.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal delay={0.25} className="mt-12">
          <LpButton href="/auth?mode=register" variant="primary">
            Empezar ahora
          </LpButton>
        </Reveal>
      </div>
    </section>
  );
}
