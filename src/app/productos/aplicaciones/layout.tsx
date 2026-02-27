import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Gestión de Aplicaciones",
  description:
    "Centraliza y gestiona todas las aplicaciones de arriendo. Compara candidatos, revisa documentos y toma decisiones rápidas con nuestro sistema de gestión.",
  keywords: [
    "gestión aplicaciones arriendo",
    "candidatos inquilinos",
    "selección arrendatarios",
    "filtrar aplicantes arriendo",
    "proceso arriendo digital",
  ],
  openGraph: {
    title: "Gestión de Aplicaciones | Leasefy",
    description:
      "Sistema centralizado para gestionar aplicaciones de arriendo. Compara candidatos y toma decisiones informadas.",
    type: "website",
  },
  alternates: {
    canonical: "/productos/aplicaciones",
  },
};

export default function AplicacionesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftwareProductJsonLd
        name="Gestión de Aplicaciones Leasefy"
        description="Sistema de gestión de aplicaciones de arriendo para comparar candidatos y tomar decisiones informadas."
        url="/productos/aplicaciones"
        category="BusinessApplication"
        rating={{ value: 4.6, count: 890 }}
      />
      {children}
    </>
  );
}
