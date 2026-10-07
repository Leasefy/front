import { Metadata } from "next";

// Lo mismo que dice la página (05-10-2026): estimación remota, sin visita,
// revisada y firmada por una persona; NO un avalúo RAA para crédito ni litigios.
export const metadata: Metadata = {
  title: "Avalúo comercial en línea | Leasefy",
  description:
    "Pide en línea una estimación del valor de referencia de tu inmueble, para venta o arriendo: sin visita, revisada y firmada por una persona. No reemplaza un avalúo de un avaluador inscrito en el RAA.",
  openGraph: {
    title: "Avalúo comercial en línea | Leasefy",
    description:
      "Estimación remota del valor de referencia de tu inmueble, revisada y firmada por una persona.",
    type: "website",
  },
};

export default function AvaluoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
