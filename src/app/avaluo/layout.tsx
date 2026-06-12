import { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: "Avalúo Comercial Certificado | Leasefy",
  description:
    "Solicita tu avalúo comercial certificado en minutos. Valuación profesional de inmuebles para compraventa, arrendamiento, crédito hipotecario o litigios.",
  openGraph: {
    title: "Avalúo Comercial Certificado | Leasefy",
    description:
      "Valuación profesional de inmuebles. Certificado, rápido y seguro.",
    type: "website",
  },
};

export default function AvaluoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForceLightMode>{children}</ForceLightMode>;
}
