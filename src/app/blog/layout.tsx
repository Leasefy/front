import { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

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
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ForceLightMode>{children}</ForceLightMode>;
}
