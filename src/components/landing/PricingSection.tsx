"use client";

import Link from "next/link";
import { Kanban, Receipt, Sparkle, Buildings, Check } from "@phosphor-icons/react";
import { EyebrowPill, Reveal, LpButton, lpHeading } from "./_kit";

const PLANS = [
  {
    icon: Kanban,
    name: "CRM inmobiliario",
    body: "Para ordenar el lado comercial: solicitudes, interesados y seguimiento.",
    features: [
      "Solicitudes e interesados centralizados",
      "Inventario de inmuebles y propietarios",
      "Asesores y pipeline de seguimiento",
    ],
    cta: "Empezar con CRM",
    featured: false,
  },
  {
    icon: Receipt,
    name: "ERP de arriendos",
    body: "Para gestionar la operación: contratos, cobros y cartera.",
    features: [
      "Contratos y pagos a propietarios",
      "Cartera, cobros y conciliación",
      "Retención y renovaciones",
    ],
    cta: "Empezar con ERP",
    featured: false,
  },
  {
    icon: Sparkle,
    name: "Agentes AI",
    body: "Para automatizar el trabajo repetitivo de punta a punta.",
    features: [
      "Matching, validación y asegurabilidad",
      "Cobranza y avalúos automatizados",
      "Conciliación de pagos",
    ],
    cta: "Activar agentes",
    featured: false,
  },
  {
    icon: Buildings,
    name: "Plataforma completa",
    body: "CRM + ERP + agentes AI para operar arriendos de punta a punta.",
    features: [
      "Todo el CRM y el ERP, integrados",
      "Los 7 agentes AI activos",
      "Trazabilidad y auditoría de cada acción",
    ],
    cta: "Empezar con Leasefy",
    featured: true,
  },
];

export default function PricingSection() {
  return (
    <section id="planes" className="bg-white py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* header — centered eyebrow + heading + short subhead */}
        <Reveal className="text-center">
          <div className="flex justify-center">
            <EyebrowPill>Planes</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mx-auto mt-7 max-w-3xl text-neutral-950`}>
            Elige cómo quieres empezar
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-neutral-500 md:text-lg">
            No tienes que implementar todo de una vez. Empieza por una capa y crece
            a tu ritmo.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:mt-16 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={0.08 * i}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border bg-white p-7 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.25)] ${
                  plan.featured ? "border-primary/40" : "border-neutral-200"
                }`}
              >
                {plan.featured && (
                  <EyebrowPill className="absolute right-6 top-6 border-primary/40 text-primary">
                    Recomendado
                  </EyebrowPill>
                )}

                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
                  <plan.icon className="h-6 w-6 text-primary" weight="duotone" />
                </span>

                <h3 className="mt-6 font-heading text-xl font-medium text-neutral-950">
                  {plan.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                  {plan.body}
                </p>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        weight="bold"
                        aria-hidden
                      />
                      <span className="text-sm leading-relaxed text-neutral-500">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <LpButton
                  href="/auth?mode=register"
                  variant={plan.featured ? "primary" : "light"}
                  arrow={plan.featured}
                  className="mt-7 w-full"
                >
                  {plan.cta}
                </LpButton>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <p className="mt-10 text-center text-sm text-neutral-500">
            ¿Equipo grande?{" "}
            <Link
              href="/auth"
              className="text-primary underline-offset-2 hover:underline"
            >
              Habla con ventas
            </Link>{" "}
            para una implementación a medida.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
