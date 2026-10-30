import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Publica gratis en Leasefy',
  // Es la ventana que se abre encima de la home (iframe): no se indexa.
  robots: { index: false, follow: false },
};

export default function VentanaLayout({ children }: { children: ReactNode }) {
  return children;
}
