import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aplicar a Propiedad",
  description:
    "Completa tu aplicación de arriendo en minutos. Proceso simple y seguro para encontrar tu próximo hogar.",
  openGraph: {
    title: "Aplicar a Propiedad | Leasefy",
    description:
      "Completa tu aplicación de arriendo en minutos. Proceso simple y seguro.",
    type: "website",
  },
};

export default function AplicarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
