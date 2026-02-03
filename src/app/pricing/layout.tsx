import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios y Planes",
  description:
    "Conoce los planes y precios de Arriendo Facil. Desde gratis para propietarios individuales hasta soluciones enterprise para inmobiliarias. Sin comisiones ocultas.",
  keywords: [
    "precios arriendo facil",
    "planes inmobiliaria",
    "costo publicar propiedad",
    "software inmobiliario precios",
    "gestion arriendos costo",
  ],
  openGraph: {
    title: "Precios y Planes | Arriendo Facil",
    description:
      "Planes flexibles para propietarios e inmobiliarias. Publica gratis o accede a herramientas avanzadas de gestion.",
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
  return children;
}
