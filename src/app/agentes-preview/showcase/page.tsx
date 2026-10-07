import AgentsShowcaseA from "@/components/landing/showcase/AgentsShowcaseA";
import AgentsShowcaseB from "@/components/landing/showcase/AgentsShowcaseB";
import AgentsShowcaseC from "@/components/landing/showcase/AgentsShowcaseC";
import { notFound } from "next/navigation";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata = {
  title: "Agentes — showcase",
  robots: { index: false, follow: false },
};

function VariantLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-y border-border bg-surface-muted">
      <div className="container-platform py-3 text-[12px] font-mono uppercase tracking-widest text-fg-subtle">
        {children}
      </div>
    </div>
  );
}

export default function AgentesShowcasePage() {
  // Vitrina de diseño: compara 3 variantes (A/B/C) del showcase de agentes de
  // la landing. Nadie la enlaza y la elección ya está hecha. Vivía en
  // /agentes-preview; desde el 02-10 esa ruta muestra los orbes. 404 en producción.
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <ForceLightMode>
      <VariantLabel>Variante A — showcase interactivo</VariantLabel>
      <AgentsShowcaseA />

      <VariantLabel>Variante B — concepto editorial</VariantLabel>
      <AgentsShowcaseB />

      <VariantLabel>Variante C — concepto inmersivo</VariantLabel>
      <AgentsShowcaseC />
    </ForceLightMode>
  );
}
