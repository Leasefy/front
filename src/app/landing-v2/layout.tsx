import type { Metadata } from "next";
import { Inter, Inter_Tight, IBM_Plex_Mono } from "next/font/google";
import { ForceLightMode } from "@/components/providers/ForceLightMode";
import "./landing.css";

/**
 * landing-v2 — port de la landing standalone (Cohere-style) a React/Next.
 * Fuentes fieles al diseño aprobado: Inter Tight (display) + Inter (cuerpo) +
 * IBM Plex Mono (metadatos), cargadas con next/font y expuestas a la hoja bespoke
 * (landing.css) vía las variables --fd/--fb/--fm. El azul #1a40ff ya coincide con
 * el cobalto de Cadence. Ruta dedicada mientras iteramos; el swap de `/` va aparte.
 */
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });

const fontVars = `:root{` +
  `--fb:${inter.style.fontFamily},ui-sans-serif,system-ui,sans-serif;` +
  `--fd:${interTight.style.fontFamily},ui-sans-serif,system-ui,sans-serif;` +
  `--fm:${plexMono.style.fontFamily},ui-monospace,SFMono-Regular,Menlo,monospace` +
  `}`;

export const metadata: Metadata = {
  title: "Leasefy — El sistema operativo inteligente para inmobiliarias",
  description:
    "CRM, ERP y agentes AI en una sola plataforma para centralizar y automatizar la operación de arriendos: solicitudes, evaluación de inquilinos, asegurabilidad, contratos, cobros, propietarios y retención.",
  robots: { index: false, follow: false }, // preview — no indexar hasta el swap de /
};

export default function LandingV2Layout({ children }: { children: React.ReactNode }) {
  return (
    <ForceLightMode>
      <style dangerouslySetInnerHTML={{ __html: fontVars }} />
      {children}
    </ForceLightMode>
  );
}
