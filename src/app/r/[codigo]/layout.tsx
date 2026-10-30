import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Te invitaron a Leasefy',
  description: 'Un colega te invita a Leasefy: tu primer mes completo gratis para publicar, arrendar, cobrar y girar sin hojas de cálculo.',
  // Es el enlace personal de quien invita (Refiere y gana): no se indexa.
  robots: { index: false, follow: false },
};

export default function RefiereYGanaLayout({ children }: { children: ReactNode }) {
  return children;
}
