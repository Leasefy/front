import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Seguro de Arriendo",
  description:
    "Protege tu inversión con nuestro seguro de arriendo. Cobertura por impago, daños a la propiedad y asistencia jurídica. Desde $50,000/mes.",
  keywords: [
    "seguro arriendo Colombia",
    "seguro impago arrendamiento",
    "póliza arriendo",
    "protección arrendador",
    "seguro inquilino",
    "garantia arriendo",
  ],
  openGraph: {
    title: "Seguro de Arriendo | Leasefy",
    description:
      "Protección completa para propietarios. Cobertura por impago, daños y asistencia jurídica.",
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
        name="Seguro de Arriendo Leasefy"
        description="Seguro de arriendo con cobertura por impago, daños a la propiedad y asistencia jurídica para propietarios en Colombia."
        url="/productos/seguro"
        category="FinanceApplication"
        offers={{ price: "50000", priceCurrency: "COP" }}
      />
      {children}
    </>
  );
}
