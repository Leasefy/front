import { Metadata } from "next";
import { FAQJsonLd } from "@/components/seo/JsonLd";
import { alternativasSoloEnEspanol } from "@/lib/idioma/metadata";

export const metadata: Metadata = {
  title: "Centro de Ayuda y Preguntas Frecuentes",
  description:
    "Resuelve tus dudas sobre arriendos en Colombia. Preguntas frecuentes para arrendadores, arrendatarios, contratos, pagos y más.",
  keywords: [
    "ayuda arriendos",
    "preguntas frecuentes alquiler",
    "como arrendar en Colombia",
    "contrato arriendo dudas",
    "scoring inquilinos que es",
  ],
  openGraph: {
    title: "Centro de Ayuda | Leasefy",
    description:
      "Encuentra respuestas a todas tus preguntas sobre arriendos, contratos, pagos y verificación de inquilinos.",
    type: "website",
  },
  // SEO (24-10): el canonical es la dirección final (/es…): la de sin prefijo redirige.
  alternates: alternativasSoloEnEspanol("/ayuda"),
};

export default function AyudaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
