import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Gestion de Aplicaciones",
  description:
    "Centraliza y gestiona todas las aplicaciones de arriendo. Compara candidatos, revisa documentos y toma decisiones rapidas con nuestro sistema de gestion.",
  keywords: [
    "gestion aplicaciones arriendo",
    "candidatos inquilinos",
    "seleccion arrendatarios",
    "filtrar aplicantes arriendo",
    "proceso arriendo digital",
  ],
  openGraph: {
    title: "Gestion de Aplicaciones | Arriendo Facil",
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
        name="Gestion de Aplicaciones Arriendo Facil"
        description="Sistema de gestion de aplicaciones de arriendo para comparar candidatos y tomar decisiones informadas."
        url="/productos/aplicaciones"
        category="BusinessApplication"
        rating={{ value: 4.6, count: 890 }}
      />
      {children}
    </>
  );
}
