"use client";

import Link from "next/link";
import { Path, ShieldCheck, Umbrella, ArrowRight } from "@phosphor-icons/react";
import { EyebrowPill, LpButton, Reveal, lpHeading } from "./_kit";

const PRODUCTS = [
  {
    num: "01",
    icon: Path,
    title: "Matching inteligente",
    body: "Encuentra inmuebles compatibles para cada solicitud y responde más rápido a los interesados.",
  },
  {
    num: "02",
    icon: ShieldCheck,
    title: "Validación de inquilinos",
    body: "Evalúa perfiles con más orden, trazabilidad y señales de riesgo claras.",
  },
  {
    num: "03",
    icon: Umbrella,
    title: "Cotización de asegurabilidad",
    body: "Reduce tiempos de respuesta y entiende qué opciones tiene cada candidato para avanzar.",
  },
];

export default function InitialProductsSection() {
  return (
    <section className="bg-white py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* Header — centered (Handle style) */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>Por dónde empezar</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-6 text-neutral-950`}>
            Empieza por los procesos que más frenan tus cierres
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-neutral-500 md:text-lg">
            Tres agentes que puedes activar de inmediato para responder más rápido,
            decidir mejor y avanzar tus solicitudes.
          </p>
        </Reveal>

        {/* 3 clear Handle-style cards */}
        <Reveal delay={0.15} className="mt-14">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PRODUCTS.map((p) => (
              <Link
                key={p.title}
                href="/auth?mode=register"
                className="group flex min-h-[260px] flex-col rounded-2xl border border-neutral-200 bg-white p-7 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_40px_-22px_rgba(15,23,42,0.25)]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <p.icon className="h-6 w-6" weight="duotone" />
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-neutral-300">
                    {p.num}
                  </span>
                </div>
                <h3 className="mt-6 font-heading text-xl font-medium text-neutral-950">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-500">
                  {p.body}
                </p>
                <span className="mt-auto flex items-center gap-1.5 pt-6 text-[13px] font-medium text-neutral-400 transition-colors group-hover:text-primary">
                  Activar agente
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    weight="bold"
                  />
                </span>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.25} className="mt-12">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LpButton href="/auth?mode=register" variant="primary" arrow>
              Probar agentes AI
            </LpButton>
            <LpButton href="#planes" variant="light">
              Ver planes
            </LpButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
