'use client';

import { useAuth } from '@/lib/auth/use-auth';
import { useCuentaParaPublicar } from '@/components/marketplace/CuentaParaPublicar';

/**
 * A dónde lleva «Publicar gratis» desde las piezas del marketplace: la misma
 * regla que «Publicar inmueble» del menú (`LandingHeaderV2`). Sin sesión, la
 * cuenta se abre encima y explica por qué; la inmobiliaria publica desde su
 * panel; su contador o una cuenta de sólo lectura van al asistente público.
 */
export function usePublicarGratis() {
  const { user, isLoading, activeContext, agencyRole } = useAuth();
  const esInmobiliaria = !isLoading && (activeContext === 'agency' || user?.role === 'agency');
  // Quien no es (todavía) de una inmobiliaria publica con el publicador rápido
  // (19-10-2026); la inmobiliaria, desde su panel.
  const href = !esInmobiliaria
    ? '/publica'
    : agencyRole === 'CONTADOR' || agencyRole === 'VIEWER'
      ? '/publica'
      : '/panel/inmobiliaria/inmuebles/nuevo';
  const { alTocar, ventana } = useCuentaParaPublicar(href);
  return { href, alTocar, ventana };
}
