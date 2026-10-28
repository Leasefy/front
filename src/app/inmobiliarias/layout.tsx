import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Inmobiliarias en Leasefy',
  description: 'Todas las inmobiliarias y agentes que publican en Leasefy: búscalas por nombre, síguelas y pregúntales.',
  alternates: { canonical: '/inmobiliarias' },
};

export default function InmobiliariasLayout({ children }: { children: ReactNode }) {
  return children;
}
