import type { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";
import { AnnouncementBar } from "@/components/landing/_kit";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import NCFeatureGrid from "@/components/landing/NCFeatureGrid";
import NCProblemSplit from "@/components/landing/NCProblemSplit";
import NCProcessCells from "@/components/landing/NCProcessCells";
import ComparisonSection from "@/components/landing/ComparisonSection";
import NCTagCloud from "@/components/landing/NCTagCloud";
import NCCtaSplit from "@/components/landing/NCCtaSplit";
import NCFooter from "@/components/landing/NCFooter";

export const metadata: Metadata = {
  title: "Leasefy — El sistema operativo inteligente para inmobiliarias",
  description:
    "CRM, ERP y agentes AI en una sola plataforma para centralizar y automatizar la operación de arriendos: solicitudes, evaluación de inquilinos, asegurabilidad, contratos, cobros, propietarios y retención.",
  robots: { index: false, follow: false }, // preview — no indexar
};

/**
 * Landing "nueva" — estructura espejo de NewsCatcher (newscatcher.ai) con marca/contenido Leasefy.
 * Preview en /landing-nueva. No reemplaza `/`.
 */
export default function LandingNuevaPage() {
  return (
    <ForceLightMode>
      <AnnouncementBar ctaLabel="Ver agentes" ctaHref="#agentes">
        Nuevo — agentes AI que operan tu inmobiliaria de punta a punta
      </AnnouncementBar>
      <LandingNav />
      <main id="main-content">
        <Hero />
        <div id="plataforma" className="scroll-mt-24">
          <NCFeatureGrid />
        </div>
        <NCProblemSplit />
        <div id="agentes" className="scroll-mt-24">
          <NCProcessCells />
        </div>
        <div id="comparar" className="scroll-mt-24">
          <ComparisonSection />
        </div>
        <NCTagCloud />
        <div id="contacto" className="scroll-mt-24">
          <NCCtaSplit />
        </div>
      </main>
      <NCFooter />
    </ForceLightMode>
  );
}
