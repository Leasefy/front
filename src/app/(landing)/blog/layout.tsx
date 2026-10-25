import { Metadata } from "next";
import { alternativasSoloEnEspanol } from "@/lib/idioma/metadata";

export const metadata: Metadata = {
  title: {
    template: "%s | Blog Leasefy",
    default: "Blog - Consejos de Arriendo en Colombia",
  },
  description:
    "Artículos, guías y consejos sobre arriendos en Colombia. Aprende a arrendar tu propiedad, verificar inquilinos, redactar contratos y más.",
  keywords: [
    "blog arriendos Colombia",
    "consejos arrendar propiedad",
    "guía contrato arriendo",
    "tips inquilinos",
    "mercado inmobiliario Colombia",
  ],
  openGraph: {
    type: "website",
    title: "Blog Leasefy",
    description:
      "Consejos, guías y artículos sobre arriendos en Colombia para propietarios e inquilinos.",
  },
  // SEO (24-10): el canonical es la dirección final (/es…): la de sin prefijo redirige.
  alternates: alternativasSoloEnEspanol("/blog"),
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
