'use client';

import { PageTransition } from '@/components/providers/PageTransition';

/**
 * Transición entre secciones del panel del propietario. Mismo criterio que
 * `panel/inmobiliaria/template.tsx`: anima sólo el contenido (el template va
 * dentro del layout, debajo de los guards y del marco) y nunca la primera
 * pantalla que llega del servidor.
 */
export default function PropietarioTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
