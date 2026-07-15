"use client";

import { MonoLabel } from "@leasefy/cadence";

import { EyebrowPill, Reveal, lpHeading } from "./_kit";

// Herramientas con las que Leasefy se conecta (pagos, scoring, comunicación, CRMs).
// Sin logos inventados: wordmarks de texto + la categoría real de cada conector.
const TOOLS = [
  { name: "Wompi", kind: "Pagos" },
  { name: "PSE", kind: "Pagos" },
  { name: "WhatsApp", kind: "Comunicación" },
  { name: "DataCrédito", kind: "Scoring" },
  { name: "Wasi", kind: "CRM" },
  { name: "Domus", kind: "CRM" },
  { name: "SINCO", kind: "ERP" },
  { name: "Webprop", kind: "CRM" },
];

export default function IntegrationsMarquee() {
  return (
    <section className="lp-band-bottom py-20 md:py-28 lg:py-32">
      <div className="container-platform">
        {/* Header — eyebrow + short one-line heading (Handle logo-cloud treatment) */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <EyebrowPill>Se conecta con tu stack</EyebrowPill>
          </div>
          <h2 className={`${lpHeading} mt-7 text-fg`}>
            Funciona con{" "}
            <span className="text-fg-subtle">lo que ya usas</span>.
          </h2>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-fg-muted md:text-lg">
            Pagos, scoring, comunicación y los CRMs del sector. Leasefy se
            integra sin cambiar tu forma de trabajar.
          </p>
        </Reveal>

        {/* Logo cloud — hairline grid of cells, quiet wordmarks (no invented logos) */}
        <Reveal delay={0.15} className="mt-14">
          <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-surface sm:grid-cols-4 md:divide-x md:divide-y md:divide-border">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="group flex min-h-[120px] flex-col items-center justify-center gap-2 border-b border-r border-border px-6 py-8 text-center transition-colors hover:bg-surface-muted md:border-0"
              >
                <span className="text-[18px] font-medium tracking-tight text-fg-muted transition-colors group-hover:text-fg md:text-[19px]">
                  {tool.name}
                </span>
                <MonoLabel className="text-[10px] tracking-[0.14em] text-fg-subtle">
                  {tool.kind}
                </MonoLabel>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
