import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "API de Integracion",
  description:
    "API REST para integrar scoring de inquilinos, verificaciones y pagos en tu sistema inmobiliario. Documentacion completa, SDKs y soporte tecnico.",
  keywords: [
    "API inmobiliaria",
    "integracion scoring inquilinos",
    "API verificacion arrendatarios",
    "webhook pagos arriendo",
    "API propiedades Colombia",
  ],
  openGraph: {
    title: "API de Integracion | Arriendo Facil",
    description:
      "Integra verificacion de inquilinos, scoring y pagos en tu plataforma. API REST documentada con SDKs.",
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
        name="API Arriendo Facil"
        description="API REST para integrar scoring de inquilinos, verificaciones y pagos de arriendo en sistemas externos."
        url="/productos/api"
        category="DeveloperApplication"
      />
      {children}
    </>
  );
}
