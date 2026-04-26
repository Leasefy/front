import { Metadata } from "next";
import { Suspense } from "react";
import { ConditionalTheme } from "@/components/providers/ConditionalTheme";
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
      <Suspense fallback={children}>
        <ConditionalTheme>{children}</ConditionalTheme>
      </Suspense>
    </ProtectedRoute>
  );
}
