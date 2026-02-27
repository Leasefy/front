import { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: {
    template: "%s | Productos Leasefy",
    default: "Productos y Soluciones",
  },
  description:
    "Descubre las soluciones de Leasefy: scoring de inquilinos con IA, contratos digitales, pagos automatizados, seguros de arriendo y más.",
  openGraph: {
    type: "website",
  },
};

export default function ProductosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForceLightMode>{children}</ForceLightMode>;
}
