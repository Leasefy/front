import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Propiedades en Arriendo",
  description:
    "Encuentra apartamentos y casas en arriendo en Bogota, Medellin, Cali y toda Colombia. Filtros inteligentes, busqueda con IA y propietarios verificados.",
  keywords: [
    "propiedades en arriendo",
    "apartamentos arriendo Bogota",
    "casas arriendo Medellin",
    "alquiler apartamentos Colombia",
    "arriendos baratos",
    "apartaestudios arriendo",
  ],
  openGraph: {
    title: "Propiedades en Arriendo | Arriendo Facil",
    description:
      "Encuentra tu proximo hogar. Apartamentos y casas en arriendo con busqueda inteligente y propietarios verificados.",
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
  return children;
}
