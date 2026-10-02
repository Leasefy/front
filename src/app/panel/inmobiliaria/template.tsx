'use client';

import { PageTransition } from '@/components/providers/PageTransition';

/**
 * Transición entre módulos del panel de la inmobiliaria.
 *
 * Next vuelve a montar este template cuando cambia el segmento que cuelga de
 * `/panel/inmobiliaria` (Contratos → Pagos → Inmuebles…): el contenido entra
 * con fundido y sube 8px. Vive DENTRO del layout, así que el sidebar, el
 * header, las secciones del módulo, el muro de migración y los guards de
 * sesión quedan quietos y montados — no parpadean.
 *
 * Navegar dentro de un mismo módulo (la lista → una ficha) no remonta el
 * template: ese movimiento lo pone cada pantalla con las primitivas de Cadence.
 */
export default function InmobiliariaTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
