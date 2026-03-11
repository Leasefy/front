import { Metadata } from "next";
import { ServiceJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Para Agentes Inmobiliarios",
  description:
    "Herramientas para agentes inmobiliarios independientes. Gestiona propiedades, genera leads, cierra arriendos más rápido con scoring de inquilinos y contratos digitales.",
  keywords: [
    "herramientas agente inmobiliario",
    "CRM agente arriendos",
    "captar propiedades arriendo",
    "cerrar arriendos rápido",
    "comisiones agente inmobiliario",
  ],
  openGraph: {
    title: "Para Agentes Inmobiliarios | Leasefy",
    description:
      "Herramientas para gestionar propiedades, generar leads y cerrar arriendos más rápido.",
    type: "website",
  },
  alternates: {
    canonical: "/para/agentes",
  },
};

export default function AgentesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceJsonLd
        name="Herramientas para Agentes Inmobiliarios"
        description="Plataforma de herramientas para agentes inmobiliarios independientes que gestionan arriendos."
        url="/para/agentes"
        serviceType="Real Estate Agent Tools"
        areaServed={["Colombia"]}
      />
      {children}
    </>
  );
}
