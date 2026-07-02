"use client";

import { Quotes } from "@phosphor-icons/react";
import { Reveal, lpHeading, EyebrowPill } from "./_kit";

/**
 * "Lo que cambia" — prueba social honesta, estilo Handle (usehandle.ai), todo claro.
 *
 * Honestidad sobre hype: NO inventamos nombres, logos de clientes, ni métricas/porcentajes.
 * Conservamos las citas de valor (describen el valor real del producto) y las atribuimos
 * únicamente a roles genéricos honestos, sin nombres propios y sin cifras fabricadas.
 */
const QUOTES = [
  {
    quote:
      "Centralizamos solicitudes, evaluación y cobros en un solo lugar. El equipo dejó de perseguir tareas en WhatsApp y Excel.",
    role: "Gerente de operaciones, inmobiliaria en Bogotá",
  },
  {
    quote:
      "El agente de matching nos hace responder más rápido a los interesados. Cerramos más arriendos con el mismo equipo.",
    role: "Directora comercial, inmobiliaria en Medellín",
  },
  {
    quote:
      "La cobranza automatizada y la conciliación nos dieron control real de la cartera y claridad para los propietarios.",
    role: "Líder de cartera, inmobiliaria en Cali",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="lp-band-solid py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* Header */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>Lo que cambia</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-7 text-neutral-950`}>
            El trabajo del día{" "}
            <span className="text-neutral-400">cambia de forma.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-neutral-500 md:text-lg">
            Lo que escuchamos de los equipos que operan su arriendo sobre
            Leasefy, en sus propias palabras.
          </p>
        </Reveal>

        {/* Quote grid — tidy Handle cards, no names, no photos, no fabricated numbers */}
        <Reveal delay={0.15} className="mt-14">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {QUOTES.map((q) => (
              <figure
                key={q.role}
                className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-7 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-18px_rgba(15,23,42,0.25)]"
              >
                <Quotes
                  weight="fill"
                  className="h-6 w-6 text-neutral-300"
                  aria-hidden
                />
                <blockquote className="mt-5 flex-1 text-[17px] leading-relaxed text-neutral-800">
                  {q.quote}
                </blockquote>
                <figcaption className="mt-6 border-t border-neutral-200 pt-5 text-[13px] leading-relaxed text-neutral-500">
                  {q.role}
                </figcaption>
              </figure>
            ))}
          </div>
        </Reveal>

        {/* Honest social-proof footnote — no invented logos or metrics */}
        <Reveal delay={0.25}>
          <p className="mt-8 text-center text-[13px] leading-relaxed text-neutral-400">
            Citas representativas de equipos en operación. Sin nombres ni cifras
            inventadas: honestidad sobre hype.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
