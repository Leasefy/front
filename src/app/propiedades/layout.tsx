import { Metadata } from "next";

/**
 * El catálogo es de arriendo Y de venta («Arrendar / Comprar»; Nico,
 * 21-10-2026: «no solo enfocado en arriendo»). Cada ficha tiene su propia
 * metadata en `[id]/layout.tsx`.
 */
export const metadata: Metadata = {
  title: "Inmuebles en arriendo y venta",
  description:
    "Encuentra apartamentos y casas para arrendar o comprar en Bogotá, Medellín, Cali y toda Colombia. Filtros inteligentes, búsqueda con IA y propietarios verificados.",
  keywords: [
    "propiedades en arriendo",
    "inmuebles en venta",
    "apartamentos arriendo Bogota",
    "casas arriendo Medellin",
    "apartamentos en venta Medellin",
    "casas en venta",
    "alquiler apartamentos Colombia",
    "arriendos baratos",
    "apartaestudios arriendo",
  ],
  openGraph: {
    title: "Inmuebles en arriendo y venta | Leasefy",
    description:
      "Encuentra tu próximo hogar para arrendar o comprar. Apartamentos y casas con búsqueda inteligente y propietarios verificados.",
    type: "website",
  },
  alternates: {
    canonical: "/propiedades",
  },
};

export default function PropiedadesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
