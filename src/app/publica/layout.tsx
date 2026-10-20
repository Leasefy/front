import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Publica gratis · Leasefy',
  description: 'Publica tus inmuebles gratis en el marketplace de Leasefy, uno o muchos.',
  robots: { index: false },
};

export default function PublicaLayout({ children }: { children: ReactNode }) {
  return children;
}
