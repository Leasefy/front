import { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: "Precios y Planes",
  description:
    "Conoce los planes y precios de Leasefy. Desde gratis para propietarios individuales hasta soluciones enterprise para inmobiliarias. Sin comisiones ocultas.",
  keywords: [
    "precios arriendo fácil",
    "planes inmobiliaria",
    "costo publicar propiedad",
    "software inmobiliario precios",
    "gestión arriendos costo",
  ],
  openGraph: {
    title: "Precios y Planes | Leasefy",
    description:
      "Planes flexibles para propietarios e inmobiliarias. Publica gratis o accede a herramientas avanzadas de gestión.",
    type: "website",
  },
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForceLightMode>{children}</ForceLightMode>;
}
