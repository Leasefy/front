import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Tu mes gratis de Leasefy',
  description: 'Un mes de Leasefy completo, de regalo de nuestro aliado: publica, arrienda, cobra y gira sin hojas de cálculo.',
  // Es un enlace de invitado: no se indexa.
  robots: { index: false, follow: false },
};

export default function AliadosLayout({ children }: { children: ReactNode }) {
  return children;
}
