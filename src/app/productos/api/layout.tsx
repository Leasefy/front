import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "API de Integración",
  description:
    "API REST para integrar scoring de inquilinos, verificaciones y pagos en tu sistema inmobiliario. Documentación completa, SDKs y soporte técnico.",
  keywords: [
    "API inmobiliaria",
    "integración scoring inquilinos",
    "API verificación arrendatarios",
    "webhook pagos arriendo",
    "API propiedades Colombia",
  ],
  openGraph: {
    title: "API de Integración | Leasefy",
    description:
      "Integra verificación de inquilinos, scoring y pagos en tu plataforma. API REST documentada con SDKs.",
    type: "website",
  },
  alternates: {
    canonical: "/productos/api",
  },
};

export default function APILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftwareProductJsonLd
        name="API Leasefy"
        description="API REST para integrar scoring de inquilinos, verificaciones y pagos de arriendo en sistemas externos."
        url="/productos/api"
        category="DeveloperApplication"
      />
      {children}
    </>
  );
}
