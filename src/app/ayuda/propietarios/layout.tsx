import type { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: "Guía para Propietarios | Centro de Ayuda | Leasefy",
  description:
    "Guía completa para propietarios: aprende a publicar tu propiedad, gestionar candidatos, firmar contratos digitales y recibir pagos de forma segura con Leasefy.",
  keywords: [
    "guía propietarios",
    "arrendar propiedad Colombia",
    "publicar inmueble",
    "gestión inquilinos",
    "contratos arrendamiento",
    "scoring inquilinos",
    "seguro arrendamiento",
  ],
  openGraph: {
    title: "Guía para Propietarios | Leasefy",
    description:
      "Todo lo que necesitas saber para arrendar tu propiedad de forma segura y eficiente.",
    type: "website",
    locale: "es_CO",
  },
};

export default function PropietariosGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForceLightMode>{children}</ForceLightMode>;
}
