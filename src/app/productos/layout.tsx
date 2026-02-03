import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Productos Arriendo Facil",
    default: "Productos y Soluciones",
  },
  description:
    "Descubre las soluciones de Arriendo Facil: scoring de inquilinos con IA, contratos digitales, pagos automatizados, seguros de arriendo y mas.",
  openGraph: {
    type: "website",
  },
};

export default function ProductosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
