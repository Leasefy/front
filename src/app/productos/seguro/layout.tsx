import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Seguro de Arriendo",
  description:
    "Protege tu inversion con nuestro seguro de arriendo. Cobertura por impago, danos a la propiedad y asistencia juridica. Desde $50,000/mes.",
  keywords: [
    "seguro arriendo Colombia",
    "seguro impago arrendamiento",
    "poliza arriendo",
    "proteccion arrendador",
    "seguro inquilino",
    "garantia arriendo",
  ],
  openGraph: {
    title: "Seguro de Arriendo | Arriendo Facil",
    description:
      "Proteccion completa para propietarios. Cobertura por impago, danos y asistencia juridica.",
    type: "website",
  },
  alternates: {
    canonical: "/productos/seguro",
  },
};

export default function SeguroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftwareProductJsonLd
        name="Seguro de Arriendo Arriendo Facil"
        description="Seguro de arriendo con cobertura por impago, danos a la propiedad y asistencia juridica para propietarios en Colombia."
        url="/productos/seguro"
        category="FinanceApplication"
        offers={{ price: "50000", priceCurrency: "COP" }}
      />
      {children}
    </>
  );
}
