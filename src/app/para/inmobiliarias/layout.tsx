import { Metadata } from "next";
import { ServiceJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Para Inmobiliarias - Software de Gestión",
  description:
    "Software inmobiliario completo para gestionar arriendos. CRM de propiedades, scoring de inquilinos, contratos digitales, pagos y reportes. API disponible.",
  keywords: [
    "software inmobiliario Colombia",
    "CRM inmobiliaria arriendos",
    "gestión propiedades arriendo",
    "plataforma inmobiliaria",
    "sistema arriendos inmobiliaria",
    "automatizar inmobiliaria",
  ],
  openGraph: {
    title: "Para Inmobiliarias | Leasefy",
    description:
      "Software completo para gestionar arriendos. CRM, scoring, contratos y pagos en una sola plataforma.",
    type: "website",
  },
  alternates: {
    canonical: "/para/inmobiliarias",
  },
};

export default function InmobiliariasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceJsonLd
        name="Software Inmobiliario para Arriendos"
        description="Plataforma completa de gestión de arriendos para inmobiliarias con CRM, scoring y automatización."
        url="/para/inmobiliarias"
        serviceType="Property Management Software"
        areaServed={["Colombia"]}
      />
      {children}
    </>
  );
}
