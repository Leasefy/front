import AgentsShowcaseA from "@/components/landing/showcase/AgentsShowcaseA";
import AgentsShowcaseB from "@/components/landing/showcase/AgentsShowcaseB";
import AgentsShowcaseC from "@/components/landing/showcase/AgentsShowcaseC";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata = {
  title: "Agentes — preview",
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

export default function AgentesPreviewPage() {
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
