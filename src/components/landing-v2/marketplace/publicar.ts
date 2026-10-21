'use client';

import { useCuentaParaPublicar } from '@/components/marketplace/CuentaParaPublicar';

/**
 * A dónde lleva «Publicar gratis» desde las piezas del marketplace: la misma
 * regla que «Publicar inmueble» del menú (`LandingHeaderV2`). Desde el
 * marketplace TODOS publican con el publicador rápido, también la inmobiliaria
 * que ya usa Leasefy (Nico, 20-10-2026); dentro del panel sigue el formulario de
 * siempre. Sin sesión, la cuenta se abre encima y explica por qué. Su contador
 * o una cuenta de sólo lectura llegan a `/publica`, que les dice que su rol no
 * publica.
 */
export function usePublicarGratis() {
  const href = '/publica';
  const { alTocar, ventana } = useCuentaParaPublicar(href);
  return { href, alTocar, ventana };
}
