"use client";

import {
  Path,
  IdentificationCard,
  Umbrella,
  Bell,
  ChartLineUp,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import { EyebrowPill, Reveal, lpHeading } from "./_kit";

const AGENTS = [
  {
    icon: Path,
    name: "Agente de matching",
    body: "Conecta solicitudes con inmuebles compatibles según presupuesto, ubicación, disponibilidad, condiciones del propietario y perfil del interesado.",
    result: "Más velocidad comercial y menos oportunidades perdidas.",
  },
  {
    icon: IdentificationCard,
    name: "Agente validador / estudio de inquilino",
    body: "Revisa información del candidato, documentos, capacidad de pago, señales de riesgo y condiciones necesarias para avanzar.",
    result: "Mejores decisiones antes de firmar.",
  },
  {
    icon: Umbrella,
    name: "Agente cotizador de asegurabilidad",
    body: "Consulta opciones de asegurabilidad y ayuda a entender si un candidato puede avanzar, con qué aseguradoras y bajo qué condiciones.",
    result: "Menos fricción entre solicitud, validación y cierre.",
  },
  {
    icon: Bell,
    name: "Agente de cobranza",
    body: "Automatiza recordatorios, seguimiento de mora, alertas y acciones de cobro según el estado de cada arrendatario.",
    result: "Menos persecución manual y más control de cartera.",
  },
  {
    icon: ChartLineUp,
    name: "Agente de avalúos",
    body: "Ayuda a estimar valores de arriendo o venta con racionales claros, comparables y contexto del mercado.",
    result: "Decisiones de precio más precisas.",
  },
  {
    icon: ArrowsClockwise,
    name: "Agente de conciliación",
    body: "Cruza pagos, movimientos bancarios, contratos y estados de cartera para reducir reprocesos.",
    result: "Operación financiera más ordenada.",
  },
];

export default function AgentsSection() {
  return (
    <section
      id="agentes"
      className="bg-white py-20 md:py-28 lg:py-32"
    >
      <div className="container-platform">
        <Reveal className="max-w-4xl">
          <EyebrowPill>Agentes AI</EyebrowPill>
          <h2 className={`${lpHeading} mt-6 text-neutral-950`}>
            Agentes AI para automatizar los momentos críticos del arriendo
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-500">
            Leasefy incorpora agentes especializados que ayudan a tu equipo a
            mover la operación más rápido, reducir tareas repetitivas y tomar
            mejores decisiones.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {AGENTS.map((a) => (
              <div
                key={a.name}
                className="flex min-h-[230px] flex-col rounded-2xl border border-neutral-200 bg-white p-7"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                  <a.icon className="h-6 w-6 text-primary" weight="duotone" />
                </span>
                <h3 className="mt-6 font-heading text-lg font-medium text-neutral-950">
                  {a.name}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">
                  {a.body}
                </p>
                <p className="mt-5 text-sm leading-relaxed text-neutral-600">
                  <span className="text-overline mr-2 text-[11px] text-primary">
                    Resultado:
                  </span>
                  {a.result}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
