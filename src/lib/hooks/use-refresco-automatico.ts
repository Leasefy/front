'use client';

import { useEffect, useRef } from 'react';

import { alCambiar } from '@/lib/api/refresco-de-datos';

/**
 * Que esta lista se vuelva a pedir cuando alguien modifique lo que muestra.
 *
 * `useApiData` (los hooks de `useInmobiliaria`) ya lo trae adentro. Esto es
 * para los hooks que tienen su propio `fetch` —propiedades, contratos,
 * arriendos, postulaciones, documentos— y que si no, se quedan mostrando lo de
 * antes hasta que alguien recargue.
 *
 * ```ts
 * const { properties, refetch } = useProperties(filtros)
 * useRefrescoAutomatico(['properties'], refetch)
 * ```
 *
 * El `refetch` va por `ref`: casi todos son un `useCallback` que cambia de
 * identidad con cada filtro, y ponerlo en las dependencias re-suscribiría en
 * cada tecla. Los recursos, en cambio, sí van en las dependencias — como
 * string, no como array, porque un literal `['x']` es nuevo en cada render.
 */
export function useRefrescoAutomatico(
  recursos: readonly string[],
  refetch: (() => void | Promise<unknown>) | undefined,
): void {
  const ultimo = useRef(refetch);
  ultimo.current = refetch;

  const clave = recursos.join(',');
  useEffect(() => {
    if (!clave) return;
    return alCambiar(clave.split(','), () => {
      void ultimo.current?.();
    });
  }, [clave]);
}
