import { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: "Propiedades en Arriendo",
  description:
    "Encuentra apartamentos y casas en arriendo en Bogotá, Medellín, Cali y toda Colombia. Filtros inteligentes, búsqueda con IA y propietarios verificados.",
  keywords: [
    "propiedades en arriendo",
    "apartamentos arriendo Bogota",
    "casas arriendo Medellin",
    "alquiler apartamentos Colombia",
    "arriendos baratos",
    "apartaestudios arriendo",
  ],
  openGraph: {
    title: "Propiedades en Arriendo | Leasefy",
    description:
      "Encuentra tu próximo hogar. Apartamentos y casas en arriendo con búsqueda inteligente y propietarios verificados.",
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
  return <ForceLightMode>{children}</ForceLightMode>;
}
