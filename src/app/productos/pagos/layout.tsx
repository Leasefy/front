import { Metadata } from "next";
import { SoftwareProductJsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "Pagos de Arriendo Automatizados",
  description:
    "Automatiza el cobro de arriendos. Recibe pagos con tarjeta, PSE, Nequi y efectivo. Recordatorios automáticos, reportes en tiempo real y conciliación simplificada.",
  keywords: [
    "pago arriendo online",
    "cobrar arriendo tarjeta",
    "pagos arriendo PSE",
    "automatizar cobro arriendo",
    "recaudar canon arrendamiento",
    "pagar arriendo Nequi",
  ],
  openGraph: {
    title: "Pagos de Arriendo Automatizados | Leasefy",
    description:
      "Recibe pagos de arriendo automáticamente. Múltiples métodos de pago, recordatorios y reportes en tiempo real.",
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
        name="Pagos de Arriendo Leasefy"
        description="Plataforma de recaudo automatizado para arriendos con múltiples métodos de pago y reportes en tiempo real."
        url="/productos/pagos"
        category="FinanceApplication"
        rating={{ value: 4.9, count: 2340 }}
      />
      {children}
    </>
  );
}
