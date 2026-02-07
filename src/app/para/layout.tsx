import { Metadata } from "next";
import { ForceLightMode } from "@/components/providers/ForceLightMode";

export const metadata: Metadata = {
  title: {
    template: "%s | Leasefy",
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
  return <ForceLightMode>{children}</ForceLightMode>;
}
