'use client';

import type { ReactNode } from 'react';
import { PageTransition as PageTransitionDelDS } from '@leasefy/cadence';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * La entrada de una página: fundido + sube 8px en 300ms con la curva de
 * entrada del sistema de movimiento. Es el `PageTransition` de Cadence; este
 * archivo sólo existe para que los `template.tsx` lo importen de un lugar.
 *
 * Lo monta un `template.tsx` (Next lo vuelve a montar en cada navegación de
 * su segmento): el raíz (`src/app/template.tsx`, cambios de sección de primer
 * nivel) y los de los tres paneles (inmobiliaria, propietario, inquilino),
 * que van DENTRO del layout —debajo de los guards, el sidebar y el header—:
 * cambiar de módulo anima sólo el contenido, nunca el marco, y los guards de
 * sesión no se vuelven a montar (no parpadean).
 *
 * - La PRIMERA pantalla de la sesión (la que viene del servidor) no se anima:
 *   se pinta visible desde el HTML. Antes arrancaba en `opacity: 0` y la
 *   landing quedaba en blanco hasta hidratar.
 * - Con movimiento reducido no sube: queda un fundido corto.
 * - Sólo entrada: el App Router desmonta la página vieja al instante.
 * - Mientras dura (300ms) el contenedor tiene `transform`: un descendiente
 *   `position: fixed` se ubica relativo a él. Al terminar queda
 *   `transform: none`. Lo flotante de una página va en un portal o `sticky`.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return <PageTransitionDelDS>{children}</PageTransitionDelDS>;
}
