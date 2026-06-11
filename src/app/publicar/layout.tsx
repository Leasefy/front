import { Metadata } from "next";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export const metadata: Metadata = {
  title: "Publicar Propiedad",
  description:
    "Publica tu propiedad en arriendo gratis. Llega a miles de inquilinos verificados en Colombia.",
  openGraph: {
    title: "Publicar Propiedad | Leasefy",
    description:
      "Publica tu propiedad en arriendo gratis. Llega a miles de inquilinos verificados.",
    type: "website",
  },
};

export default function PublicarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      allowedRoles={['landlord', 'agency']}
      blockedAgencyRoles={['CONTADOR', 'VIEWER']}
    >
      {children}
    </ProtectedRoute>
  );
}
