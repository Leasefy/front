import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Pagos de Arriendo Automatizados",
  description:
    "Automatiza el cobro de arriendos. Recibe pagos con tarjeta, PSE, Nequi y efectivo. Recordatorios automaticos, reportes en tiempo real y conciliacion simplificada.",
  keywords: [
    "pago arriendo online",
    "cobrar arriendo tarjeta",
    "pagos arriendo PSE",
    "automatizar cobro arriendo",
    "recaudar canon arrendamiento",
    "pagar arriendo Nequi",
  ],
  openGraph: {
    title: "Pagos de Arriendo Automatizados | Arriendo Facil",
    description:
      "Recibe pagos de arriendo automaticamente. Multiples metodos de pago, recordatorios y reportes en tiempo real.",
    type: "website",
  },
  alternates: {
    canonical: "/productos/pagos",
  },
};

export default function PagosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SoftwareProductJsonLd
        name="Pagos de Arriendo Arriendo Facil"
        description="Plataforma de recaudo automatizado para arriendos con multiples metodos de pago y reportes en tiempo real."
        url="/productos/pagos"
        category="FinanceApplication"
        rating={{ value: 4.9, count: 2340 }}
      />
      {children}
    </>
  );
}
