"use client";

import { UsersThree, Stack, Sparkle } from "@phosphor-icons/react";
import { EyebrowPill, Reveal, lpHeading } from "./_kit";

const LAYERS = [
  {
    num: "01",
    name: "CRM",
    icon: UsersThree,
    lead: "El frente comercial.",
    items: ["Solicitudes", "Interesados", "Inmuebles", "Asesores", "Pipeline"],
    resultLabel: "Más arriendos",
    resultRest: " cerrados.",
  },
  {
    num: "02",
    name: "ERP",
    icon: Stack,
    lead: "La columna operativa.",
    items: ["Contratos", "Cobros", "Cartera", "Propietarios", "Pagos", "Retención"],
    resultLabel: "Más control",
    resultRest: " operativo.",
  },
  {
    num: "03",
    name: "Agentes AI",
    icon: Sparkle,
    lead: "La capa que ejecuta sola.",
    items: ["Matching", "Validación", "Asegurabilidad", "Cobranza", "Avalúos", "Conciliación"],
    resultLabel: "Menos trabajo manual",
    resultRest: " y menos riesgo.",
  },
];

export default function ArchitectureSection() {
  return (
    <section
      id="plataforma"
      className="bg-white py-20 md:py-28 lg:py-32"
    >
      <div className="container-platform">
        {/* Header — centered */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>La plataforma</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-7 text-neutral-950`}>
            Una plataforma.{" "}
            <span className="text-neutral-400">Tres capas</span> para operar
            mejor.
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-neutral-500 md:text-lg">
            Leasefy no es un módulo más: es un sistema completo que cubre el
            ciclo entero del arriendo, de la solicitud a la retención.
          </p>
        </Reveal>

        {/* 3 capas — thin shared borders, Handle capabilities grid */}
        <Reveal delay={0.15} className="mt-14">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-neutral-200 md:grid-cols-3 md:divide-x md:divide-neutral-200">
            {LAYERS.map((layer) => (
              <div
                key={layer.name}
                className="group flex min-h-[340px] flex-col p-8 transition-colors hover:bg-neutral-50/70"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <layer.icon className="h-6 w-6" weight="duotone" />
                  </span>
                  <span className="font-mono text-[12px] tabular-nums text-neutral-300">
                    {layer.num}
                  </span>
                </div>
                <h3 className="mt-6 font-heading text-xl font-medium tracking-tight text-neutral-950">
                  {layer.name}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">
                  {layer.lead}
                </p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {layer.items.map((it) => (
                    <li
                      key={it}
                      className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px] text-neutral-600"
                    >
                      {it}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-baseline gap-2 border-t border-neutral-200 pt-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-400">
                    Resultado
                  </span>
                  <p className="text-[15px] leading-relaxed text-neutral-950">
                    <span className="font-medium text-primary">
                      {layer.resultLabel}
                    </span>
                    {layer.resultRest}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
