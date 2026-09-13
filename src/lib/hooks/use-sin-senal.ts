'use client';

/**
 * ¿El navegador dice que NO hay red?
 *
 * Es la mitad de `haySenal()` (`lib/inventario/hay-senal.ts`) que se puede
 * responder sin pedirle nada a nadie, y es la mitad confiable: un `false` de
 * `navigator.onLine` es definitivo —no hay interfaz de red arriba—, mientras
 * que un `true` no garantiza que salga un paquete. Por eso esto sólo sirve
 * para lo que necesita CERTEZA DE AUSENCIA: las guardas del panel, que no
 * pueden expulsar a nadie por no haber podido preguntar.
 *
 * Para decidir si vale la pena SUBIR algo se sigue usando `haySenal()`, que
 * comprueba de verdad contra `/health`.
 *
 * Arranca en `false` a propósito: en el servidor no hay `navigator`, y
 * suponer «sin señal» en el primer render cambiaría el HTML entre servidor y
 * navegador.
 */

import { useEffect, useState } from 'react';

/** Sin React: lo mismo, para código que no está en un componente. */
export function estaSinSenal(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function useSinSenal(): boolean {
  const [sinSenal, setSinSenal] = useState(false);

  useEffect(() => {
    const mirar = () => setSinSenal(estaSinSenal());
    mirar();
    window.addEventListener('online', mirar);
    window.addEventListener('offline', mirar);
    return () => {
      window.removeEventListener('online', mirar);
      window.removeEventListener('offline', mirar);
    };
  }, []);

  return sinSenal;
}
