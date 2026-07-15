"use client";

import {
  UserPlus,
  MagnifyingGlass,
  ShieldCheck,
  FileMagnifyingGlass,
  FileText,
  CurrencyDollar,
  ChartLineUp,
} from "@phosphor-icons/react";
import { EyebrowPill, Reveal, lpHeading } from "./_kit";

const STEPS = [
  {
    n: "01",
    icon: UserPlus,
    title: "Entra una solicitud",
    body: "Leasefy registra el interesado y lo organiza dentro del CRM.",
  },
  {
    n: "02",
    icon: MagnifyingGlass,
    title: "El agente hace matching",
    body: "Sugiere inmuebles compatibles con la necesidad del cliente.",
  },
  {
    n: "03",
    icon: ShieldCheck,
    title: "Se valida el inquilino",
    body: "El agente analiza documentos, capacidad de pago y señales de riesgo.",
  },
  {
    n: "04",
    icon: FileMagnifyingGlass,
    title: "Se cotiza asegurabilidad",
    body: "Leasefy ayuda a identificar opciones para avanzar con respaldo.",
  },
  {
    n: "05",
    icon: FileText,
    title: "Se gestiona el contrato",
    body: "El ERP organiza documentos, vigencia, condiciones y estados.",
  },
  {
    n: "06",
    icon: CurrencyDollar,
    title: "Se automatizan cobros y cartera",
    body: "Pagos, recordatorios, mora y seguimiento quedan centralizados.",
  },
  {
    n: "07",
    icon: ChartLineUp,
    title: "Se informa y retiene al propietario",
    body: "Leasefy ayuda a mantener visibilidad, anticipar renovaciones y evitar pérdida de inmuebles.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" className="lp-band py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* Header — centered (Handle steps/flow treatment) */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>Cómo funciona</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-7 text-fg`}>
            De solicitud a retención, con agentes en{" "}
            <span className="text-fg-subtle">cada etapa</span>
          </h2>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-fg-muted md:text-lg">
            Cada paso del ciclo del arriendo, ejecutado en secuencia por la
            plataforma —de la primera solicitud hasta la retención del propietario.
          </p>
        </Reveal>

        {/* Numbered steps — calm vertical list with a thin connecting rule */}
        <div className="relative mt-16 md:mt-20">
          {/* hairline rule that connects the numbers */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-[19px] top-4 bottom-4 hidden w-px bg-border-faint sm:block md:left-[23px]"
          />

          <ol className="space-y-0">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={0.05 * i}>
                <li className="group relative flex gap-6 border-b border-border py-7 last:border-b-0 md:gap-10 md:py-9">
                  {/* mono number — open on the background, primary accent */}
                  <span className="relative z-10 shrink-0 font-mono text-[15px] font-medium tabular-nums text-fg-subtle transition-colors group-hover:text-primary md:text-base">
                    {step.n}
                  </span>

                  {/* content */}
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-heading text-xl font-medium tracking-tight text-fg md:text-[22px]">
                        {step.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-fg-muted md:text-base">
                        {step.body}
                      </p>
                    </div>

                    {/* guide icon — soft, hairline border */}
                    <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-fg-subtle transition-colors group-hover:text-primary md:flex">
                      <step.icon className="h-5 w-5" weight="duotone" />
                    </span>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
