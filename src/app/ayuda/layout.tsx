import { Metadata } from "next";
import { FAQJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Centro de Ayuda y Preguntas Frecuentes",
  description:
    "Resuelve tus dudas sobre arriendos en Colombia. Preguntas frecuentes para arrendadores, arrendatarios, contratos, pagos y mas.",
  keywords: [
    "ayuda arriendos",
    "preguntas frecuentes alquiler",
    "como arrendar en Colombia",
    "contrato arriendo dudas",
    "scoring inquilinos que es",
  ],
  openGraph: {
    title: "Centro de Ayuda | Arriendo Facil",
    description:
      "Encuentra respuestas a todas tus preguntas sobre arriendos, contratos, pagos y verificacion de inquilinos.",
    type: "website",
  },
  alternates: {
    canonical: "/ayuda",
  },
};

export default function AyudaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
