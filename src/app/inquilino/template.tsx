'use client';

import { PageTransition } from '@/components/providers/PageTransition';

/**
 * Transición entre secciones del portal del inquilino. Mismo criterio que
 * `panel/inmobiliaria/template.tsx`: anima sólo el contenido (el template va
 * dentro del layout, debajo de los guards y del marco) y nunca la primera
 * pantalla que llega del servidor.
 */
export default function InquilinoTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
