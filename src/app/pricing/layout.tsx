import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios y Planes",
  description:
    "Planes desde $0/mes para propietarios y desde $149.000/mes para inmobiliarias. Administración completa al 5-6% del arriendo. Sin contratos de permanencia.",
  keywords: [
    "precios arriendos Colombia",
    "planes administración arriendos",
    "costo administración inmueble",
    "software inmobiliario precios",
    "gestión arriendos costo",
    "administración arriendos porcentaje",
  ],
  openGraph: {
    title: "Precios y Planes | Leasefy",
    description:
      "Planes transparentes para propietarios e inmobiliarias. Administración de arriendos desde 5% del arriendo mensual. Sin contratos de permanencia.",
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
  return <>{children}</>;
}
