import { Metadata } from "next";
import { ServiceJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Para Inquilinos - Encuentra tu Hogar Ideal",
  description:
    "Busca apartamentos y casas en arriendo verificados. Aplica online, firma contratos digitales y paga de forma segura. Sin fiadores tradicionales.",
  keywords: [
    "buscar arriendo Bogota",
    "apartamentos arriendo Medellin",
    "arriendo sin fiador",
    "como arrendar apartamento",
    "aplicar arriendo online",
    "casas arriendo Colombia",
    "alquiler apartamentos",
  ],
  openGraph: {
    title: "Para Inquilinos | Arriendo Facil",
    description:
      "Encuentra tu proximo hogar. Propiedades verificadas, aplicacion online y contratos digitales. Sin fiadores tradicionales.",
    type: "website",
  },
  alternates: {
    canonical: "/para/inquilinos",
  },
};

export default function InquilinosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceJsonLd
        name="Busqueda de Arriendo para Inquilinos"
        description="Plataforma para encontrar propiedades en arriendo verificadas con aplicacion online y contratos digitales."
        url="/para/inquilinos"
        serviceType="Real Estate Search Service"
        areaServed={["Colombia"]}
      />
      {children}
    </>
  );
}
