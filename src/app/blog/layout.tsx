import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Blog Arriendo Facil",
    default: "Blog - Consejos de Arriendo en Colombia",
  },
  description:
    "Articulos, guias y consejos sobre arriendos en Colombia. Aprende a arrendar tu propiedad, verificar inquilinos, redactar contratos y mas.",
  keywords: [
    "blog arriendos Colombia",
    "consejos arrendar propiedad",
    "guia contrato arriendo",
    "tips inquilinos",
    "mercado inmobiliario Colombia",
  ],
  openGraph: {
    type: "website",
    title: "Blog Arriendo Facil",
    description:
      "Consejos, guias y articulos sobre arriendos en Colombia para propietarios e inquilinos.",
  },
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
