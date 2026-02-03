import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Arriendo Facil",
    default: "Soluciones para Ti",
  },
  description:
    "Soluciones de arriendo personalizadas para propietarios, inquilinos, inmobiliarias y agentes inmobiliarios en Colombia.",
  openGraph: {
    type: "website",
  },
};

export default function ParaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
