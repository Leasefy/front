import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Contratos Digitales de Arriendo",
  description:
    "Crea y firma contratos de arriendo digitalmente. Plantillas legales colombianas, firma electronica valida, clausulas personalizables y seguimiento en tiempo real.",
  keywords: [
    "contrato arriendo digital",
    "firma electronica arriendo",
    "plantilla contrato arrendamiento Colombia",
    "contrato arriendo online",
    "firma digital contrato",
    "documento arriendo legal",
  ],
  openGraph: {
    title: "Contratos Digitales de Arriendo | Arriendo Facil",
    description:
      "Contratos de arriendo 100% digitales con firma electronica valida en Colombia. Plantillas legales y seguimiento en tiempo real.",
    type: "website",
  },
  alternates: {
    canonical: "/productos/contratos",
  },
};

export default function ContratosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftwareProductJsonLd
        name="Contratos Digitales Arriendo Facil"
        description="Plataforma de contratos de arriendo digitales con firma electronica y plantillas legales colombianas."
        url="/productos/contratos"
        category="BusinessApplication"
        rating={{ value: 4.7, count: 1890 }}
      />
      {children}
    </>
  );
}
