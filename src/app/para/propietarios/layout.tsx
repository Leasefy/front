import { Metadata } from "next";
import { ServiceJsonLd, LocalBusinessJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Para Propietarios - Arrienda con Confianza",
  description:
    "Arrienda tu propiedad de forma segura. Inquilinos verificados con scoring AI, contratos digitales, pagos automáticos y seguro incluido. Publica gratis.",
  keywords: [
    "arrendar propiedad Colombia",
    "como arrendar apartamento",
    "encontrar inquilino confiable",
    "publicar propiedad arriendo",
    "verificar inquilino",
    "cobrar arriendo automático",
    "contrato arriendo seguro",
  ],
  openGraph: {
    title: "Para Propietarios | Leasefy",
    description:
      "Arrienda tu propiedad con inquilinos verificados, contratos digitales y pagos automáticos. Publicar es gratis.",
    type: "website",
  },
  alternates: {
    canonical: "/para/propietarios",
  },
};

export default function PropietariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceJsonLd
        name="Plataforma de Arriendo para Propietarios"
        description="Servicio completo para arrendar propiedades en Colombia con verificación de inquilinos, contratos digitales y pagos automáticos."
        url="/para/propietarios"
        serviceType="Real Estate Rental Service"
        areaServed={["Colombia"]}
      />
      <LocalBusinessJsonLd />
      {children}
    </>
  );
}
