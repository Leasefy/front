'use client';

import { useEffect, useState } from 'react';

import { mockDeSegundoFactorHabilitado } from '@/lib/config/entorno';

/**
 * ¿Se ofrece el mock del segundo factor? Arranca en `false` (servidor y primera
 * pintada) y se decide al montar, cuando ya se puede mirar el dominio: así el
 * HTML del servidor coincide y, ante cualquier duda, el mock no aparece.
 */
export function useMockDelSegundoFactor(): boolean {
  const [habilitado, setHabilitado] = useState(false);
  useEffect(() => {
    setHabilitado(mockDeSegundoFactorHabilitado());
  }, []);
  return habilitado;
}
